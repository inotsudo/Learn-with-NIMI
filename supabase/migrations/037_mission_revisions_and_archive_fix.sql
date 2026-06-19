-- ============================================================
--  NIMIPIKO — 037: Mission Revisions, Publish/Rollback,
--  Archive-Deadlock Fix, Bulk Import Curriculum Linking
--
--  Phase BK.1 — Content Safety & Versioning. Four additive,
--  backward-compatible pieces:
--
--  1. mission_versions gains revision_number / is_current /
--     created_at. Every existing row defaults to
--     (revision_number=1, is_current=true, created_at=now()) —
--     identical behaviour to today for any mission that has never
--     been revised. The old unique(mission_id, language) becomes
--     unique(mission_id, language, revision_number); two new
--     partial unique indexes enforce "≤1 published revision" and
--     "exactly 1 current/editable revision" per (mission, language).
--
--  2. New RPCs: publish_mission_version_revision (Publish AND
--     Rollback — same operation, symmetric) and
--     create_mission_version_revision ("Create Revision" — clones
--     a published row into a new editable draft while the original
--     stays live).
--
--  3. Archive-deadlock fix: new level_slot_available() helper +
--     create-or-replace of get_current_level / get_curriculum_missions
--     / complete_curriculum_mission (027) so a level's "total"
--     no longer counts a level_missions slot whose mapped mission
--     has been archived — a child can no longer get permanently
--     stuck on a level because one category's mission was archived.
--
--  4. admin_bulk_import_missions (029) gains an optional
--     level_number per row (upserts level_missions, replace
--     semantics) and becomes revision-safe: re-importing a
--     (mission, language) whose current version is already
--     published creates a new draft revision instead of editing
--     the live row in place (consistent with "prevent live editing
--     of published content").
--
--  No data is deleted; no existing rows lose their published state.
-- ============================================================

-- ── 1. mission_versions: revision columns ───────────────────
alter table mission_versions
  add column if not exists revision_number integer not null default 1 check (revision_number > 0),
  add column if not exists is_current boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

alter table mission_versions drop constraint if exists mission_versions_mission_id_language_key;
alter table mission_versions add constraint mission_versions_mission_id_language_revision_key
  unique (mission_id, language, revision_number);

create unique index if not exists mission_versions_one_published_idx
  on mission_versions (mission_id, language) where published;
create unique index if not exists mission_versions_one_current_idx
  on mission_versions (mission_id, language) where is_current;


-- ── 2. level_slot_available: is a level_missions slot's mapped
--      mission still visible to a child of p_language? Mirrors the
--      join condition get_curriculum_missions already uses to
--      return a category's mission. ───────────────────────────
create or replace function level_slot_available(p_mission_id uuid, p_category_slug text, p_language text)
returns boolean
language sql stable as $$
  select exists (
    select 1 from missions m
    join mission_versions mv on mv.mission_id = m.id
      and mv.language = category_effective_language(p_category_slug, p_language)
      and mv.published
    where m.id = p_mission_id and m.active
  );
$$;

grant execute on function level_slot_available(uuid, text, text) to authenticated;


-- ── 3. get_current_level: same as 026, plus level_slot_available
--      filter so an archived level-mapped mission's slot drops out
--      of both "total" and "done" for that level instead of
--      permanently blocking it. ─────────────────────────────────
create or replace function get_current_level(p_child_id uuid, p_language text)
returns integer
language sql stable as $$
  select coalesce(
    (
      select lm.level_number
      from level_missions lm
      left join child_progress cp
        on cp.mission_id = lm.mission_id
       and cp.language = p_language
       and cp.child_id = p_child_id
      where level_slot_available(lm.mission_id, lm.category_slug, p_language)
      group by lm.level_number
      having count(*) > count(cp.mission_id)
      order by lm.level_number
      limit 1
    ),
    (select max(level_number) from level_missions)
  );
$$;

grant execute on function get_current_level(uuid, text) to authenticated;


-- ── 4. get_curriculum_missions: same as 026, v_total now uses
--      level_slot_available so level_complete reflects only
--      currently-available slots. ───────────────────────────────
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
  level_complete    boolean
)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_language       text;
  v_lang           text;
  v_level          integer;
  v_cat            record;
  v_mission_id     uuid;
  v_total          integer;
  v_done           integer;
  v_level_complete boolean;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  select children.language into v_language from children where children.id = p_child_id;
  v_language := coalesce(v_language, 'en');

  v_level := get_current_level(p_child_id, v_language);

  select count(*) into v_total
  from level_missions lm
  where lm.level_number = v_level
    and level_slot_available(lm.mission_id, lm.category_slug, v_language);

  select count(*) into v_done
  from level_missions lm
  join child_progress cp
    on cp.mission_id = lm.mission_id and cp.language = v_language and cp.child_id = p_child_id
  where lm.level_number = v_level;

  v_level_complete := v_total > 0 and v_done >= v_total;

  for v_cat in select c.slug from categories c order by c.sort_order loop

    select lm.mission_id into v_mission_id
    from level_missions lm
    where lm.level_number = v_level and lm.category_slug = v_cat.slug;

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
        v_level_complete as level_complete
      from missions m
      join mission_versions mv
        on mv.mission_id = m.id and mv.language = v_lang and mv.published
      where m.id = v_mission_id;

  end loop;
end;
$$;

grant execute on function get_curriculum_missions(uuid) to authenticated;


-- ── 5. complete_curriculum_mission: same as 027 (no-skip guard
--      preserved verbatim), v_level_total now uses
--      level_slot_available. ───────────────────────────────────
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
  v_level_total    integer;
  v_level_done     integer;
  v_level_complete boolean := false;
  v_max_level      integer;
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

  v_level_before := get_current_level(p_child_id, v_language);

  -- ── No-skip guard (027): p_mission_id must belong to the child's
  --    current level. Shared placeholder mission_ids (used by 7/8
  --    categories across levels 1-3) appear in level_missions for
  --    every level they're reused in, so legitimate current-level
  --    completions are never rejected by this check. ──
  if not exists (
    select 1 from level_missions
    where level_number = v_level_before and mission_id = p_mission_id
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

  -- ── Level-complete badge / curriculum-complete certificate, checked
  --    against the level the child was *on* before this completion.
  --    v_level_total now only counts slots whose mapped mission is
  --    still available (level_slot_available) — an archived
  --    level-mapped mission no longer holds this count permanently
  --    above v_level_done. ──
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

  return jsonb_build_object(
    'stars_earned', v_stars,
    'new_badges', to_jsonb(v_new_badges),
    'new_certificate', v_new_cert,
    'level', get_current_level(p_child_id, v_language),
    'level_complete', v_level_complete
  );
end;
$$;

grant execute on function complete_curriculum_mission(uuid, uuid) to authenticated;


-- ── 6. publish_mission_version_revision: Publish AND Rollback —
--      same atomic operation, just applied to a draft (Publish) or
--      an older archived revision (Rollback). Demotes whichever
--      sibling row is currently published/current, promotes the
--      target, and keeps missions.active in sync. ────────────────
create or replace function publish_mission_version_revision(p_version_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_mission_id uuid;
  v_language   text;
begin
  if not is_admin() then
    raise exception 'publish_mission_version_revision: admin access required';
  end if;

  select mission_id, language into v_mission_id, v_language
  from mission_versions where id = p_version_id;

  if v_mission_id is null then
    raise exception 'publish_mission_version_revision: mission_versions row not found';
  end if;

  -- demote the currently-published sibling (if any) to archived
  update mission_versions
    set status = 'archived'
    where mission_id = v_mission_id and language = v_language
      and status = 'published' and id <> p_version_id;

  -- demote the currently-current sibling (if any)
  update mission_versions
    set is_current = false
    where mission_id = v_mission_id and language = v_language
      and is_current = true and id <> p_version_id;

  -- promote the target
  update mission_versions
    set status = 'published', is_current = true
    where id = p_version_id;

  -- keep missions.active in sync (true if ANY language is now published)
  update missions
    set active = exists (
      select 1 from mission_versions where mission_id = v_mission_id and status = 'published'
    )
    where id = v_mission_id;
end;
$$;

grant execute on function publish_mission_version_revision(uuid) to authenticated;


-- ── 7. create_mission_version_revision: "Create Revision" — clones
--      a published row into a new editable draft (revision_number
--      = max+1, is_current=true, status='draft'); the original stays
--      published/live (is_current=false) until the new draft is
--      published. Returns the new row's id. ──────────────────────
create or replace function create_mission_version_revision(p_version_id uuid)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_row mission_versions%rowtype;
  v_next_revision integer;
  v_new_id uuid;
begin
  if not is_admin() then
    raise exception 'create_mission_version_revision: admin access required';
  end if;

  select * into v_row from mission_versions where id = p_version_id;
  if v_row.id is null then
    raise exception 'create_mission_version_revision: mission_versions row not found';
  end if;

  if v_row.status <> 'published' then
    raise exception 'create_mission_version_revision: source revision is not published';
  end if;

  select coalesce(max(revision_number), 0) + 1 into v_next_revision
  from mission_versions where mission_id = v_row.mission_id and language = v_row.language;

  update mission_versions set is_current = false where id = p_version_id;

  insert into mission_versions (
    mission_id, language, title, subtitle, tip_text, media_url, content_json,
    status, revision_number, is_current
  ) values (
    v_row.mission_id, v_row.language, v_row.title, v_row.subtitle, v_row.tip_text,
    v_row.media_url, v_row.content_json, 'draft', v_next_revision, true
  ) returning id into v_new_id;

  return v_new_id;
end;
$$;

grant execute on function create_mission_version_revision(uuid) to authenticated;


-- ── 8. admin_bulk_import_missions: optional level_number per row
--      (upserts level_missions, replace semantics) + revision-safe
--      upsert (re-importing over a published version creates a new
--      draft revision instead of editing the live row in place). ──
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

    select id into v_mission_id from missions
      where category_slug = v_category_slug and sequence = v_sequence;

    if v_mission_id is null then
      insert into missions (category_slug, sequence, type, stars, duration_minutes, active)
      values (v_category_slug, v_sequence, v_type, coalesce(v_stars, 10), coalesce(v_duration, 10), false)
      returning id into v_mission_id;
      v_missions_created := v_missions_created + 1;
    end if;

    if v_level_number is not null then
      insert into level_missions (level_number, category_slug, mission_id)
      values (v_level_number, v_category_slug, v_mission_id)
      on conflict (level_number, category_slug) do update set mission_id = excluded.mission_id;
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
