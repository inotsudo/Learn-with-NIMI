-- ============================================================
-- Migration 038: Curriculum V2 Foundation — Units
--
-- Phase BK.2. Adds the "Unit" tier between Level and Category:
-- Framework -> Level (curriculum_levels) -> Unit (NEW) -> Category
-- -> Lesson (missions) -> Language Version (mission_versions).
--
-- level_missions.unit_number (default 1) means every existing row
-- becomes (level_number, 1, category_slug) — an identical effective
-- key to today's (level_number, category_slug) PK. With every row
-- at unit_number=1, every redefined RPC below returns identical
-- values to migration 037's for all data that exists today — see
-- docs/phase-bk-curriculum-v2-backward-compat.md for the full proof.
--
-- New: get_current_position(child, lang) -> (level_number,
-- unit_number) is the new progression core; get_current_level
-- becomes a 1-line wrapper over it. get_curriculum_missions gains
-- `unit`/`unit_complete` (per-Unit, fires ~every 8 missions) while
-- `level_complete` gets its new meaning (fires only when the
-- Level's LAST unit is done). complete_curriculum_mission awards a
-- new additive `unit-{level}-{unit}-complete-{lang}` badge alongside
-- the existing `level-{N}-complete-{lang}` badge, which now also
-- serves as the "sticky" anchor get_current_position uses to avoid
-- demoting a child if Units are added to an already-completed Level
-- later (BK.4, frozen).
--
-- See docs/phase-bk-curriculum-v2-architecture.md,
-- -migration-strategy.md, -backward-compat.md and
-- -capacity-planning.md for the full design (BK.2 implements §3-4
-- of the architecture doc exactly).
-- ============================================================


-- ── 1. level_missions.unit_number + PK change ─────────────────
-- Old PK was (level_number, category_slug). Every existing row
-- becomes (level_number, 1, category_slug) — identical effective
-- key. level_missions_mission_id_idx (026) is untouched.
alter table level_missions
  add column unit_number integer not null default 1 check (unit_number > 0);

alter table level_missions drop constraint level_missions_pkey;
alter table level_missions
  add primary key (level_number, unit_number, category_slug);


-- ── 2. curriculum_levels.total_units ──────────────────────────
-- Nullable, admin-set, purely informational (e.g. "Level 1: 3/52
-- Units defined"). Not read by any progression RPC.
alter table curriculum_levels add column if not exists total_units integer;


-- ── 3. curriculum_units (new, optional metadata table) ────────
-- For CMS labeling only ("Unit 3: Animals & Habitats"). RLS mirrors
-- curriculum_levels (032): authenticated read, admin write. A
-- (level_number, unit_number) pair with no row here is valid — BK.3
-- falls back to "Unit {unit_number}".
create table if not exists curriculum_units (
  level_number integer not null references curriculum_levels(level_number),
  unit_number  integer not null check (unit_number > 0),
  title        text,
  theme_emoji  text,
  primary key (level_number, unit_number)
);

alter table curriculum_units enable row level security;

drop policy if exists "auth: read curriculum_units" on curriculum_units;
create policy "auth: read curriculum_units" on curriculum_units
  for select using (auth.uid() is not null);

drop policy if exists "admin: full access" on curriculum_units;
create policy "admin: full access" on curriculum_units
  for all using (is_admin()) with check (is_admin());


-- ── 4. get_current_position: new progression core ─────────────
-- Same shape as 037's get_current_level, but grouped by
-- (level_number, unit_number) — "find the smallest incomplete
-- (Level, Unit)" — plus a sticky filter that excludes any
-- level_number for which the child already holds
-- level-{N}-complete-{lang} (so newly-added Units in an
-- already-completed Level are never retroactively shown). Falls
-- back to (max level_number, max unit_number within it) once
-- everything available is done.
create or replace function get_current_position(p_child_id uuid, p_language text)
returns table(level_number integer, unit_number integer)
language sql stable as $$
  with candidate as (
    select lm.level_number, lm.unit_number, 0 as prio
    from level_missions lm
    left join child_progress cp
      on cp.mission_id = lm.mission_id
     and cp.language   = p_language
     and cp.child_id   = p_child_id
    where level_slot_available(lm.mission_id, lm.category_slug, p_language)
      and not exists (
        select 1 from child_achievements ca
        where ca.child_id = p_child_id
          and ca.language = p_language
          and ca.type = 'badge'
          and ca.slug = 'level-' || lm.level_number || '-complete-' || p_language
      )
    group by lm.level_number, lm.unit_number
    having count(*) > count(cp.mission_id)
    order by lm.level_number, lm.unit_number
    limit 1
  ),
  fallback as (
    select lm2.level_number, max(lm2.unit_number) as unit_number, 1 as prio
    from level_missions lm2
    where lm2.level_number = (select max(level_number) from level_missions)
    group by lm2.level_number
  )
  select level_number, unit_number
  from (
    select * from candidate
    union all
    select * from fallback
  ) combined
  order by prio
  limit 1;
$$;

grant execute on function get_current_position(uuid, text) to authenticated;


-- ── 5. get_current_level: thin wrapper over get_current_position ──
-- Return type (integer) unchanged from 037 — preserves the existing
-- signature for every caller that only needs the Level number.
create or replace function get_current_level(p_child_id uuid, p_language text)
returns integer
language sql stable as $$
  select level_number from get_current_position(p_child_id, p_language);
$$;

grant execute on function get_current_level(uuid, text) to authenticated;


-- ── 6. get_curriculum_missions: resolves (level, unit) via
--      get_current_position, joins level_missions on all three key
--      columns, returns two new columns (unit, unit_complete) in
--      addition to the existing ones. Requires dropping the old
--      function first — Postgres rejects a `create or replace` that
--      changes a `returns table` column list. ────────────────────
drop function if exists get_curriculum_missions(uuid);

create or replace function get_curriculum_missions(p_child_id uuid)
returns table (
  id                uuid,
  story_id          uuid,
  level             integer,
  type              text,
  title             text,
  duration_minutes  integer,
  media_url         text,
  category          text,
  stars             integer,
  subtitle          text,
  tip_text          text,
  content           jsonb,
  completed         boolean,
  level_complete    boolean,
  unit              integer,
  unit_complete     boolean
)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_language       text;
  v_lang           text;
  v_level          integer;
  v_unit           integer;
  v_cat            record;
  v_mission_id     uuid;
  v_unit_total     integer;
  v_unit_done      integer;
  v_unit_complete  boolean;
  v_level_total    integer;
  v_level_done     integer;
  v_level_complete boolean;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  select children.language into v_language from children where children.id = p_child_id;
  v_language := coalesce(v_language, 'en');

  select gcp.level_number, gcp.unit_number into v_level, v_unit
  from get_current_position(p_child_id, v_language) gcp;

  -- Unit-scoped totals (this Unit's 8 categories) — the frequent
  -- "Adventure complete" signal.
  select count(*) into v_unit_total
  from level_missions lm
  where lm.level_number = v_level and lm.unit_number = v_unit
    and level_slot_available(lm.mission_id, lm.category_slug, v_language);

  select count(*) into v_unit_done
  from level_missions lm
  join child_progress cp
    on cp.mission_id = lm.mission_id and cp.language = v_language and cp.child_id = p_child_id
  where lm.level_number = v_level and lm.unit_number = v_unit;

  v_unit_complete := v_unit_total > 0 and v_unit_done >= v_unit_total;

  -- Level-scoped totals (ALL units of this level) — the rare
  -- "Framework Mastered" milestone.
  select count(*) into v_level_total
  from level_missions lm
  where lm.level_number = v_level
    and level_slot_available(lm.mission_id, lm.category_slug, v_language);

  select count(*) into v_level_done
  from level_missions lm
  join child_progress cp
    on cp.mission_id = lm.mission_id and cp.language = v_language and cp.child_id = p_child_id
  where lm.level_number = v_level;

  v_level_complete := v_level_total > 0 and v_level_done >= v_level_total;

  for v_cat in select c.slug from categories c order by c.sort_order loop

    select lm.mission_id into v_mission_id
    from level_missions lm
    where lm.level_number = v_level and lm.unit_number = v_unit and lm.category_slug = v_cat.slug;

    if v_mission_id is null then
      continue;
    end if;

    v_lang := category_effective_language(v_cat.slug, v_language);

    return query
      select
        m.id, m.story_id, v_level as level, m.type,
        mv.title,
        m.duration_minutes,
        mv.media_url,
        m.category_slug as category, m.stars,
        mv.subtitle,
        mv.tip_text,
        mv.content_json as content,
        exists (
          select 1 from child_progress cp
          where cp.child_id = p_child_id and cp.language = v_language and cp.mission_id = m.id
        ) as completed,
        v_level_complete as level_complete,
        v_unit as unit,
        v_unit_complete as unit_complete
      from missions m
      join mission_versions mv
        on mv.mission_id = m.id and mv.language = v_lang and mv.published
      where m.id = v_mission_id;

  end loop;
end;
$$;

grant execute on function get_curriculum_missions(uuid) to authenticated;


-- ── 7. complete_curriculum_mission: no-skip guard now scoped to
--      (level, unit); category badge and program certificate blocks
--      unchanged from 037; new unit-complete badge
--      (unit-{level}-{unit}-complete-{lang}), reworked level-complete
--      badge (level-{N}-complete-{lang}, across ALL units of the
--      level — the sticky anchor get_current_position relies on) +
--      curriculum-complete certificate. ──────────────────────────
create or replace function complete_curriculum_mission(p_child_id uuid, p_mission_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_language       text;
  v_category       text;
  v_lang           text;
  v_stars          integer;
  v_existed        boolean;
  v_rows           integer;
  v_total          integer;
  v_done           integer;
  v_new_badges     text[] := '{}';
  v_new_cert       text;
  v_all_cats       integer;
  v_done_cats      integer;
  v_level_before   integer;
  v_unit_before    integer;
  v_unit_total     integer;
  v_unit_done      integer;
  v_unit_complete  boolean := false;
  v_level_total    integer;
  v_level_done     integer;
  v_level_complete boolean := false;
  v_max_level      integer;
  v_level_after    integer;
  v_unit_after     integer;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  select children.language into v_language from children where children.id = p_child_id;
  v_language := coalesce(v_language, 'en');

  select m.category_slug, m.stars into v_category, v_stars
  from missions m where m.id = p_mission_id;

  if v_category is null then
    raise exception 'mission not found';
  end if;

  v_lang := category_effective_language(v_category, v_language);

  select gcp.level_number, gcp.unit_number into v_level_before, v_unit_before
  from get_current_position(p_child_id, v_language) gcp;

  -- ── No-skip guard (027/037), now scoped to (level, unit): the
  --    mission must belong to the child's current (Level, Unit).
  --    Shared placeholder mission_ids appear in level_missions for
  --    every (level, unit) they're reused in, so legitimate
  --    current-position completions are never rejected. ──
  if not exists (
    select 1 from level_missions
    where level_number = v_level_before and unit_number = v_unit_before and mission_id = p_mission_id
  ) then
    raise exception 'mission not in current level';
  end if;

  select exists (
    select 1 from child_progress
    where child_id = p_child_id and mission_id = p_mission_id and language = v_language
  ) into v_existed;

  insert into child_progress (child_id, mission_id, language, stars_earned, completed_at)
  values (p_child_id, p_mission_id, v_language, coalesce(v_stars, 0), now())
  on conflict (child_id, mission_id, language)
  do update set completed_at = excluded.completed_at;

  if v_existed then
    v_stars := 0; -- already completed before — no new lifetime stars
  end if;

  -- Category badge: every active mission published for this category's
  -- effective language (native, or 'en' fallback) done at least once?
  -- (unchanged from 037)
  select count(*) into v_total
  from missions m
  join mission_versions mv on mv.mission_id = m.id and mv.language = v_lang and mv.published
  where m.category_slug = v_category and m.active;

  select count(*) into v_done
  from child_progress cp
  join missions m on m.id = cp.mission_id
  where cp.child_id = p_child_id and cp.language = v_language and m.category_slug = v_category;

  if v_total > 0 and v_done >= v_total then
    insert into child_achievements (child_id, language, type, slug)
    values (p_child_id, v_language, 'badge', v_category || '-master-' || v_language)
    on conflict (child_id, language, type, slug) do nothing;

    get diagnostics v_rows = row_count;
    if v_rows > 0 then
      v_new_badges := array_append(v_new_badges, v_category || '-master-' || v_language);
    end if;
  end if;

  -- Program certificate: every category that has published content in
  -- this child's language (or its English fallback) is fully complete?
  -- (unchanged from 037)
  select count(*) into v_all_cats
  from categories c
  where (
    select count(*) from missions m2
    join mission_versions mv2 on mv2.mission_id = m2.id
      and mv2.language = category_effective_language(c.slug, v_language) and mv2.published
    where m2.category_slug = c.slug and m2.active
  ) > 0;

  select count(*) into v_done_cats
  from categories c
  where (
    select count(*) from missions m2
    join mission_versions mv2 on mv2.mission_id = m2.id
      and mv2.language = category_effective_language(c.slug, v_language) and mv2.published
    where m2.category_slug = c.slug and m2.active
  ) > 0
  and (
    select count(*) from child_progress cp2
    join missions m3 on m3.id = cp2.mission_id
    where cp2.child_id = p_child_id and cp2.language = v_language and m3.category_slug = c.slug
  ) >= (
    select count(*) from missions m2
    join mission_versions mv2 on mv2.mission_id = m2.id
      and mv2.language = category_effective_language(c.slug, v_language) and mv2.published
    where m2.category_slug = c.slug and m2.active
  );

  if v_all_cats > 0 and v_done_cats >= v_all_cats then
    insert into child_achievements (child_id, language, type, slug)
    values (p_child_id, v_language, 'certificate', 'program-complete-' || v_language)
    on conflict (child_id, language, type, slug) do nothing;

    get diagnostics v_rows = row_count;
    if v_rows > 0 then
      v_new_cert := 'program-complete-' || v_language;
    end if;
  end if;

  -- ── Unit-complete badge (NEW): all level_slot_available rows for
  --    (level_before, unit_before) done? Generalizes 037's
  --    per-Level badge to per-Unit — fires every ~8 missions. ──
  select count(*) into v_unit_total
  from level_missions lm
  where lm.level_number = v_level_before and lm.unit_number = v_unit_before
    and level_slot_available(lm.mission_id, lm.category_slug, v_language);

  select count(*) into v_unit_done
  from level_missions lm
  join child_progress cp
    on cp.mission_id = lm.mission_id and cp.language = v_language and cp.child_id = p_child_id
  where lm.level_number = v_level_before and lm.unit_number = v_unit_before;

  if v_unit_total > 0 and v_unit_done >= v_unit_total then
    v_unit_complete := true;

    insert into child_achievements (child_id, language, type, slug)
    values (p_child_id, v_language, 'badge', 'unit-' || v_level_before || '-' || v_unit_before || '-complete-' || v_language)
    on conflict (child_id, language, type, slug) do nothing;

    get diagnostics v_rows = row_count;
    if v_rows > 0 then
      v_new_badges := array_append(v_new_badges, 'unit-' || v_level_before || '-' || v_unit_before || '-complete-' || v_language);
    end if;
  end if;

  -- ── Level-complete badge / curriculum-complete certificate (037's
  --    "Level-complete" check, now scoped across ALL units of
  --    level_before — the rare "Framework Mastered" milestone, and
  --    the sticky anchor get_current_position relies on). ──
  select count(*) into v_level_total
  from level_missions lm
  where lm.level_number = v_level_before
    and level_slot_available(lm.mission_id, lm.category_slug, v_language);

  select count(*) into v_level_done
  from level_missions lm
  join child_progress cp
    on cp.mission_id = lm.mission_id and cp.language = v_language and cp.child_id = p_child_id
  where lm.level_number = v_level_before;

  if v_level_total > 0 and v_level_done >= v_level_total then
    v_level_complete := true;

    insert into child_achievements (child_id, language, type, slug)
    values (p_child_id, v_language, 'badge', 'level-' || v_level_before || '-complete-' || v_language)
    on conflict (child_id, language, type, slug) do nothing;

    get diagnostics v_rows = row_count;
    if v_rows > 0 then
      v_new_badges := array_append(v_new_badges, 'level-' || v_level_before || '-complete-' || v_language);
    end if;

    select max(level_number) into v_max_level from level_missions;

    if v_level_before >= v_max_level then
      insert into child_achievements (child_id, language, type, slug)
      values (p_child_id, v_language, 'certificate', 'curriculum-complete-' || v_language)
      on conflict (child_id, language, type, slug) do nothing;

      get diagnostics v_rows = row_count;
      if v_rows > 0 then
        v_new_cert := 'curriculum-complete-' || v_language;
      end if;
    end if;
  end if;

  select gcp.level_number, gcp.unit_number into v_level_after, v_unit_after
  from get_current_position(p_child_id, v_language) gcp;

  return jsonb_build_object(
    'stars_earned', v_stars,
    'new_badges', to_jsonb(v_new_badges),
    'new_certificate', v_new_cert,
    'level', v_level_after,
    'unit', v_unit_after,
    'level_complete', v_level_complete,
    'unit_complete', v_unit_complete
  );
end;
$$;

grant execute on function complete_curriculum_mission(uuid, uuid) to authenticated;


-- ── 8. admin_bulk_import_missions: optional unit_number per row
--      (default 1), level_missions upsert now targets the new
--      3-column PK. Existing Phase BK.1 templates (never set
--      unit_number) produce unit_number=1 for every row — matches
--      the same logical row the old 2-column upsert would have. ──
create or replace function admin_bulk_import_missions(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row               jsonb;
  v_idx               integer;
  v_category_slug     text;
  v_sequence          integer;
  v_type              text;
  v_stars             integer;
  v_duration          integer;
  v_language          text;
  v_title             text;
  v_subtitle          text;
  v_tip_text          text;
  v_media_url         text;
  v_content_json      jsonb;
  v_level_number      integer;
  v_unit_number       integer;
  v_key               text;
  v_seen_keys         text[] := '{}';
  v_mission_id        uuid;
  v_version_id        uuid;
  v_version_status    text;
  v_version_revnum    integer;
  v_missions_created  integer := 0;
  v_versions_created  integer := 0;
  v_versions_updated  integer := 0;
  v_revisions_created integer := 0;
begin
  if not is_admin() then
    raise exception 'admin_bulk_import_missions: admin access required';
  end if;

  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'admin_bulk_import_missions: p_rows must be a JSON array';
  end if;

  -- ── Pass 1: validate the whole batch before writing anything ──
  v_idx := 0;
  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    v_category_slug := v_row->>'category_slug';
    v_sequence       := (v_row->>'sequence')::integer;
    v_type           := v_row->>'type';
    v_language       := v_row->>'language';
    v_title          := v_row->>'title';
    v_content_json   := v_row->'content_json';
    v_level_number   := (v_row->>'level_number')::integer;
    v_unit_number    := coalesce((v_row->>'unit_number')::integer, 1);

    if v_category_slug is null or not exists (select 1 from categories where slug = v_category_slug) then
      raise exception 'Row %: unknown category_slug "%"', v_idx, coalesce(v_category_slug, '(missing)');
    end if;

    if v_sequence is null or v_sequence <= 0 then
      raise exception 'Row %: sequence must be a positive integer', v_idx;
    end if;

    if v_type is null or v_type not in ('sing', 'move', 'color', 'watch', 'read', 'story') then
      raise exception 'Row %: invalid type "%"', v_idx, coalesce(v_type, '(missing)');
    end if;

    if v_language is null or v_language not in ('en', 'fr', 'rw') then
      raise exception 'Row %: invalid language "%"', v_idx, coalesce(v_language, '(missing)');
    end if;

    if coalesce(trim(v_title), '') = '' then
      raise exception 'Row %: title is required', v_idx;
    end if;

    if v_content_json is not null and jsonb_typeof(v_content_json) is distinct from 'object' then
      raise exception 'Row %: content_json must be a JSON object', v_idx;
    end if;

    if v_level_number is not null then
      if v_level_number <= 0 then
        raise exception 'Row %: level_number must be a positive integer', v_idx;
      end if;
      if not exists (select 1 from curriculum_levels where level_number = v_level_number) then
        raise exception 'Row %: unknown level_number %', v_idx, v_level_number;
      end if;
    end if;

    if v_unit_number <= 0 then
      raise exception 'Row %: unit_number must be a positive integer', v_idx;
    end if;

    v_key := v_category_slug || ':' || v_sequence::text || ':' || v_language;
    if v_key = any(v_seen_keys) then
      raise exception 'Row %: duplicate (category_slug, sequence, language) combination % within this batch', v_idx, v_key;
    end if;
    v_seen_keys := array_append(v_seen_keys, v_key);

    v_idx := v_idx + 1;
  end loop;

  -- ── Pass 2: find-or-create missions, link levels, upsert mission_versions ──
  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    v_category_slug := v_row->>'category_slug';
    v_sequence       := (v_row->>'sequence')::integer;
    v_type           := v_row->>'type';
    v_stars          := (v_row->>'stars')::integer;
    v_duration       := (v_row->>'duration_minutes')::integer;
    v_language       := v_row->>'language';
    v_title          := v_row->>'title';
    v_subtitle       := v_row->>'subtitle';
    v_tip_text       := v_row->>'tip_text';
    v_media_url      := v_row->>'media_url';
    v_content_json   := v_row->'content_json';
    v_level_number   := (v_row->>'level_number')::integer;
    v_unit_number    := coalesce((v_row->>'unit_number')::integer, 1);

    select id into v_mission_id from missions
      where category_slug = v_category_slug and sequence = v_sequence;

    if v_mission_id is null then
      insert into missions (category_slug, sequence, type, stars, duration_minutes, active)
      values (v_category_slug, v_sequence, v_type, coalesce(v_stars, 10), coalesce(v_duration, 10), false)
      returning id into v_mission_id;
      v_missions_created := v_missions_created + 1;
    end if;

    if v_level_number is not null then
      insert into level_missions (level_number, unit_number, category_slug, mission_id)
      values (v_level_number, v_unit_number, v_category_slug, v_mission_id)
      on conflict (level_number, unit_number, category_slug) do update set mission_id = excluded.mission_id;
    end if;

    select id, status, revision_number into v_version_id, v_version_status, v_version_revnum
      from mission_versions
      where mission_id = v_mission_id and language = v_language and is_current = true;

    if v_version_id is null then
      insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json, status)
      values (v_mission_id, v_language, v_title, v_subtitle, v_tip_text, v_media_url, coalesce(v_content_json, '{}'::jsonb), 'draft');
      v_versions_created := v_versions_created + 1;
    elsif v_version_status = 'published' then
      -- don't live-edit a published version — create a new draft revision instead
      update mission_versions set is_current = false where id = v_version_id;
      insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json, status, revision_number, is_current)
      values (v_mission_id, v_language, v_title, v_subtitle, v_tip_text, v_media_url, coalesce(v_content_json, '{}'::jsonb), 'draft', v_version_revnum + 1, true);
      v_revisions_created := v_revisions_created + 1;
    else
      update mission_versions set
        title = v_title,
        subtitle = v_subtitle,
        tip_text = v_tip_text,
        media_url = v_media_url,
        content_json = coalesce(v_content_json, content_json)
      where id = v_version_id;
      v_versions_updated := v_versions_updated + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'missions_created', v_missions_created,
    'versions_created', v_versions_created,
    'versions_updated', v_versions_updated,
    'revisions_created', v_revisions_created
  );
end;
$$;

grant execute on function admin_bulk_import_missions(jsonb) to authenticated;
