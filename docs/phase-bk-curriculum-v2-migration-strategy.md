# Phase BK.2 — Curriculum V2 Migration Strategy

**Date:** 2026-06-15
**Status:** Draft strategy for a future migration (proposed `038_curriculum_units.sql`)
and coordinated client changes. **Not applied.** This document is the
concrete "what would migration 038 + its client PR contain" reference for
BK.2's own future plan-mode session. See
[phase-bk-curriculum-v2-architecture.md](phase-bk-curriculum-v2-architecture.md)
for the design rationale and
[phase-bk-curriculum-v2-backward-compat.md](phase-bk-curriculum-v2-backward-compat.md)
for the no-regression proof.

All SQL below is written against the **current live definitions** (migration
037, read in full) — every `create or replace function` is a diff from an
actual deployed function, not a reconstruction.

---

## 1. Ordering constraints

1. `level_missions.unit_number` + PK change **must ship in the same
   migration/PR as**:
   - `admin_bulk_import_missions`'s `level_missions` upsert (its `on conflict
     (level_number, category_slug)` target stops matching any constraint
     once the PK becomes `(level_number, unit_number, category_slug)` —
     Postgres raises *"no unique or exclusion constraint matching the ON
     CONFLICT specification"*).
   - `app/admin/MissionManager.tsx:206`'s client-side
     `.upsert({...}, { onConflict: 'level_number,category_slug' })` — same
     failure mode, client-side. **This is the one call site that breaks
     immediately on migration day if not updated.**
2. `get_current_position` must be defined **before** `get_current_level`
   (the new wrapper calls it).
3. `get_curriculum_missions` / `complete_curriculum_mission` redefinitions
   depend on `get_current_position` and the unchanged `level_slot_available`
   (037) — both must exist first.
4. `curriculum_units` table and `curriculum_levels.total_units` have no
   dependents — can be created/added at any point, including after the RPCs
   (kept first below for readability).

---

## 2. Proposed migration `038_curriculum_units.sql`

```sql
-- ============================================================
--  NIMIPIKO — 038: Curriculum V2 — Units layer
--
--  Phase BK.2. Additive, backward-compatible:
--
--  1. level_missions gains unit_number (default 1) — every
--     existing row becomes (level_number, 1, category_slug),
--     identical effective key to today's PK.
--  2. curriculum_levels gains total_units (nullable, informational).
--  3. New curriculum_units metadata table (CMS labeling only).
--  4. New get_current_position(child, lang) -> (level_number,
--     unit_number) — generalizes get_current_level with a Unit
--     dimension and the sticky level-complete rule.
--     get_current_level becomes a 1-line wrapper.
--  5. get_curriculum_missions / complete_curriculum_mission
--     redefined to resolve (level, unit) via get_current_position
--     and to award the new unit-{level}-{unit}-complete-{lang}
--     badge alongside the existing level-{N}-complete-{lang}.
--  6. admin_bulk_import_missions: optional unit_number per row
--     (default 1), level_missions upsert target becomes
--     (level_number, unit_number, category_slug).
--
--  With zero unit_number=2+ rows in level_missions (true until
--  BK.4), every RPC below produces byte-identical results to
--  migration 037 — see phase-bk-curriculum-v2-backward-compat.md.
-- ============================================================

-- ── 1. level_missions: add the Unit dimension ──────────────
alter table level_missions
  add column unit_number integer not null default 1 check (unit_number > 0);

alter table level_missions drop constraint level_missions_pkey;
alter table level_missions
  add primary key (level_number, unit_number, category_slug);


-- ── 2. curriculum_levels: optional admin-facing target ─────
alter table curriculum_levels add column if not exists total_units integer;


-- ── 3. curriculum_units: per-Unit CMS metadata (optional) ───
create table if not exists curriculum_units (
  level_number integer not null references curriculum_levels(level_number),
  unit_number  integer not null check (unit_number > 0),
  title        text,
  theme_emoji  text,
  primary key (level_number, unit_number)
);

alter table curriculum_units enable row level security;

create policy "curriculum_units_select_auth" on curriculum_units
  for select to authenticated using (true);

create policy "curriculum_units_admin_write" on curriculum_units
  for all to authenticated using (is_admin()) with check (is_admin());


-- ── 4. get_current_position: smallest incomplete (level, unit),
--      skipping any level_number with a sticky level-complete
--      badge. Generalizes 037's get_current_level. ─────────────
create or replace function get_current_position(p_child_id uuid, p_language text)
returns table(level_number integer, unit_number integer)
language sql stable as $$
  select coalesce(
    (
      select lm.level_number, lm.unit_number
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
    (
      select lm2.level_number, max(lm2.unit_number)
      from level_missions lm2
      where lm2.level_number = (select max(level_number) from level_missions)
      group by lm2.level_number
    )
  );
$$;

grant execute on function get_current_position(uuid, text) to authenticated;


-- ── 5. get_current_level: now a thin wrapper over
--      get_current_position, for callers that only need the
--      Level number (parent dashboard, achievement slugs). ─────
create or replace function get_current_level(p_child_id uuid, p_language text)
returns integer
language sql stable as $$
  select level_number from get_current_position(p_child_id, p_language);
$$;

grant execute on function get_current_level(uuid, text) to authenticated;


-- ── 6. get_curriculum_missions: resolve (level, unit) via
--      get_current_position, join level_missions on all three
--      key columns. Return columns renamed/clarified:
--        unit_complete  (was level_complete) — current Unit's
--                       8 categories all done (frequent signal)
--        level_complete (new meaning) — current Level's LAST
--                       Unit is done (rare milestone) ───────────
create or replace function get_curriculum_missions(p_child_id uuid)
returns table (
  id                uuid,
  story_id          uuid,
  level             integer,
  unit              integer,
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
  unit_complete     boolean,
  level_complete    boolean
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

  select gp.level_number, gp.unit_number into v_level, v_unit
  from get_current_position(p_child_id, v_language) gp;

  -- "Unit Complete" — today's whole get_curriculum_missions logic,
  -- scoped to (v_level, v_unit).
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

  -- "Level Complete" — every Unit currently defined for v_level done.
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
        m.id, m.story_id, v_level as level, v_unit as unit, m.type,
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
        v_unit_complete as unit_complete,
        v_level_complete as level_complete
      from missions m
      join mission_versions mv
        on mv.mission_id = m.id and mv.language = v_lang and mv.published
      where m.id = v_mission_id;

  end loop;
end;
$$;

grant execute on function get_curriculum_missions(uuid) to authenticated;


-- ── 7. complete_curriculum_mission: resolve (level, unit) via
--      get_current_position; no-skip guard now checks
--      (level_number, unit_number, mission_id); award
--      unit-{level}-{unit}-complete-{lang} in addition to the
--      existing level-{N}-complete-{lang} (now computed across
--      ALL units of that level). ───────────────────────────────
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

  select gp.level_number, gp.unit_number into v_level_before, v_unit_before
  from get_current_position(p_child_id, v_language) gp;

  -- ── No-skip guard (027/037), now scoped to (level, unit): ──
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
    v_stars := 0;
  end if;

  -- Category badge (unchanged — not grouped by level/unit).
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

  -- Program certificate (unchanged).
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

  -- ── Unit-complete badge: every available slot in
  --    (v_level_before, v_unit_before) done? ──
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
    values (p_child_id, v_language, 'badge',
            'unit-' || v_level_before || '-' || v_unit_before || '-complete-' || v_language)
    on conflict (child_id, language, type, slug) do nothing;

    get diagnostics v_rows = row_count;
    if v_rows > 0 then
      v_new_badges := array_append(v_new_badges,
        'unit-' || v_level_before || '-' || v_unit_before || '-complete-' || v_language);
    end if;
  end if;

  -- ── Level-complete badge / curriculum-complete certificate:
  --    every available slot across ALL units of v_level_before
  --    done? (This is the sticky anchor get_current_position
  --    checks — fires once, never revoked.) ──
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
    'level', v_level_before,
    'unit', v_unit_before,
    'unit_complete', v_unit_complete,
    'level_complete', v_level_complete
  );
end;
$$;

grant execute on function complete_curriculum_mission(uuid, uuid) to authenticated;


-- ── 8. admin_bulk_import_missions: optional unit_number per row
--      (default 1); level_missions upsert target becomes
--      (level_number, unit_number, category_slug). Everything
--      else identical to 037. ──────────────────────────────────
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

  -- ── Pass 1: validate (unchanged except for unit_number) ──
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

  -- ── Pass 2: find-or-create missions, link levels/units, upsert mission_versions ──
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
```

---

## 3. Coordinated client changes (same PR as the migration)

### 3.1 Must-fix (breaks immediately on migration day)

- **`app/admin/MissionManager.tsx:206`** — "+ New Mission" creates a
  `level_missions` row via
  `.upsert({ level_number: createLevel, category_slug: categorySlug,
  mission_id: newMission.id }, { onConflict: 'level_number,category_slug' })`.
  Must become
  `.upsert({ level_number: createLevel, unit_number: 1, category_slug:
  categorySlug, mission_id: newMission.id }, { onConflict:
  'level_number,unit_number,category_slug' })` — new missions are linked
  into Unit 1 of the chosen Level (BK.3's Units manager is where an admin
  would later move them to a different Unit).

### 3.2 Coordinated rename (`level_complete` → `unit_complete` + new `level_complete`)

`get_curriculum_missions`'s return shape gains `unit` (new) and
`unit_complete` (renamed from `level_complete`); `level_complete` keeps its
name but changes meaning (fires far less often). Frontend call sites that
read `.level_complete` from a `CurriculumMission` and expect "the per-Level
mastery banner that fires every ~8 missions" must switch to
`.unit_complete`:

- `lib/queries.ts` — `CurriculumMission` type: add `unit: number;
  unit_complete: boolean;`, keep `level_complete: boolean`.
- `app/page.tsx`, `app/missions/page.tsx`,
  `app/missions/[category]/page.tsx` — wherever today's `level_complete` is
  used to show "🎉 Adventure complete" / advance-to-next messaging, read
  `unit_complete` instead.
- `components/missions/DailyAdventureBanner.tsx` — same; reserve
  `level_complete` for a new, separate "🏆 {framework_name} Mastered!"
  milestone banner (BK.3 UI work — BK.2 only needs the RPC to return the
  correct booleans; wiring a *new* banner can land in BK.3 alongside the
  Units CMS).
- `complete_curriculum_mission`'s returned jsonb gains `unit` and
  `unit_complete` alongside the renamed-meaning `level_complete` — any
  caller of `completeCurriculumMission()` (`lib/queries.ts`) reading
  `.level_complete` for the frequent-completion toast needs the same switch
  to `.unit_complete`.

### 3.3 Safe today, but must be addressed before BK.4 (Units 2+ content)

These read `level_missions` filtered only by `level_number` (not
`unit_number`). With every row at `unit_number=1` they remain byte-identical
to today; once Unit 2+ rows exist for some level, they'd start
double-counting or arbitrarily picking among units. Tracked here so BK.3's
Units-manager work doesn't miss them:

- `app/admin/LevelEditor.tsx` (`lines 50, 82-84, 122-124, 141-152, 178`) —
  becomes the BK.3 "Units" manager; inherently being rewritten to be
  unit-aware.
- `app/admin/MissionManager.tsx` (`lines 60-66, 77-83`) — per-mission
  "used in Level N" badges; needs `unit_number` in the select + display
  (feeds into BK.3's Step 7 "used in Level X, Unit Y" safety check).
- `app/admin/AnalyticsManager.tsx:137` and `lib/adminAnalytics.ts:127-133` —
  curriculum coverage analytics; needs a `unit_number` dimension added to
  avoid conflating units when computing `maxLevel`/per-category mission
  maps.
- `lib/queries.ts:629-633` (`getMaxCurriculumLevel`) and `:644-650`
  (`getLevelMissions` / `LevelMissionRow`) — add `unit_number` to the
  selected columns and the type; `getMaxCurriculumLevel` itself is unaffected
  (still `max(level_number)`).
- `lib/parentInsights.ts:76-91` — `levelSlots = levelMissions.filter(lm =>
  lm.level_number === currentLevel)` would need to additionally filter by
  the child's current `unit_number` (from `get_current_position`) once Units
  2+ exist, otherwise "progress within current level" denominators inflate.

None of these require changes *for BK.2 to ship safely* — they're called
out so BK.3 has a complete checklist before BK.4 unfreezes content work.

---

## 4. Rollback notes

- All `alter table ... add column` / `create table if not exists` /
  `create policy` statements are reversible with straightforward `drop
  column` / `drop table` / `drop policy` — no data loss on rollback since
  nothing is deleted, only added.
- The PK change (`drop constraint` + `add primary key`) is reversible by
  reversing the two statements, **provided no `unit_number <> 1` rows have
  been inserted yet** (true throughout BK.2/BK.3, since BK.4 — the only
  source of `unit_number > 1` rows — remains frozen).
- All five `create or replace function` statements can be rolled back by
  re-running migration 037's definitions verbatim (037 is idempotent
  `create or replace`).

---

## 5. Verification plan for BK.2

1. New self-cleaning SQL suite `curriculum_v2_units_test.sql`
   (`supabase/tests/`, following the existing pattern in
   `curriculum_progression_test.sql` / `multilingual_journey_separation_test.sql`):
   - **Regression block**: re-run every assertion from
     `curriculum_progression_test.sql` and
     `multilingual_journey_separation_test.sql` unchanged (no
     `unit_number=2` rows exist) — must all still pass, proving
     byte-identical behavior.
   - **New-unit scenario**: temporarily insert a throwaway `unit_number=2`
     set of 8 `level_missions` rows for a test level; drive a test child
     through Unit 1 → assert `level-{N}-complete-{lang}` is **not** yet
     awarded, `unit-{N}-1-complete-{lang}` **is**, and
     `get_current_position` returns `(N, 2)`.
   - **Sticky scenario**: a test child who already has
     `level-{N}-complete-{lang}` from *before* the throwaway Unit 2 existed
     → after Unit 2 is inserted, assert `get_current_position` still returns
     a position in a *later* level (not demoted back to `(N, 2)`).
   - Cleanup: delete the throwaway `level_missions`/`curriculum_units` rows
     and test child at the end (same self-cleaning pattern as existing
     suites).
2. `npx tsc --noEmit` clean after the §3.2 rename + §3.1 fix.
3. Smoke-check `/admin`, `/`, `/missions`, `/missions/[category]` → 200.
