-- ============================================================
--  NIMIPIKO — 042: Curriculum Operations Hardening
--  Phase BK.3.8
--
--  Four admin RPCs that close operational gaps:
--
--  1. admin_archive_lesson(p_mission_id) — atomically archives
--     ALL versions (all languages, all revisions) for a mission
--     and sets missions.active = false.
--
--     Fixes a bug in the MissionManager client: it only archived
--     is_current=true rows, leaving the still-published sibling
--     revision (is_current=false, status='published') visible to
--     learners. This RPC archives every row regardless of is_current.
--
--  2. admin_restore_lesson(p_mission_id) — restores the is_current
--     revision of each language from 'archived' → 'draft'.
--     Does not republish — admin must publish explicitly after
--     reviewing. missions.active stays false until re-publish.
--
--  3. get_curriculum_integrity_report() — returns a JSONB snapshot:
--     orphaned_stories      (stories not linked by any missions.story_id)
--     inactive_slots        (level_missions entries whose mission is inactive)
--     missing_category_slots (level/unit missing one of the 8 category slugs)
--     partial_translations  (slots with <3 published languages)
--
--  4. export_unit_content(p_level_number, p_unit_number) — returns
--     all published mission_versions for the unit as a JSONB array
--     compatible with admin_bulk_import_missions V2 format, enabling
--     export → re-import round-trip verification.
-- ============================================================


-- ── 1. admin_archive_lesson ──────────────────────────────────
create or replace function admin_archive_lesson(p_mission_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_archived integer;
begin
  if not is_admin() then
    raise exception 'admin_archive_lesson: admin access required';
  end if;

  if not exists (select 1 from missions where id = p_mission_id) then
    raise exception 'admin_archive_lesson: mission not found';
  end if;

  -- Archive ALL revisions across all languages, not just is_current.
  -- The sync_mission_version_published trigger fires per row and sets
  -- published = false for each archived row, so the published partial
  -- unique index is never violated.
  update mission_versions
    set status = 'archived'
  where mission_id = p_mission_id
    and status <> 'archived';

  get diagnostics v_archived = row_count;

  -- Sync missions.active (no published versions remain).
  update missions
    set active = false
  where id = p_mission_id;

  return jsonb_build_object('archived_version_count', v_archived);
end;
$$;

grant execute on function admin_archive_lesson(uuid) to authenticated;


-- ── 2. admin_restore_lesson ──────────────────────────────────
create or replace function admin_restore_lesson(p_mission_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_restored integer;
begin
  if not is_admin() then
    raise exception 'admin_restore_lesson: admin access required';
  end if;

  if not exists (select 1 from missions where id = p_mission_id) then
    raise exception 'admin_restore_lesson: mission not found';
  end if;

  -- Restore only the is_current revision of each language from
  -- 'archived' → 'draft'. The published sibling (if any) stays
  -- archived — admin must explicitly publish the draft to go live.
  update mission_versions
    set status = 'draft'
  where mission_id = p_mission_id
    and is_current = true
    and status = 'archived';

  get diagnostics v_restored = row_count;

  if v_restored = 0 then
    raise exception 'admin_restore_lesson: no archived is_current versions found — nothing to restore';
  end if;

  -- missions.active intentionally stays false until admin publishes.
  -- This ensures restored content goes through review before becoming
  -- visible to learners.

  return jsonb_build_object('restored_version_count', v_restored);
end;
$$;

grant execute on function admin_restore_lesson(uuid) to authenticated;


-- ── 3. get_curriculum_integrity_report ───────────────────────
create or replace function get_curriculum_integrity_report()
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_orphaned_stories      jsonb;
  v_inactive_slots        jsonb;
  v_missing_slots         jsonb;
  v_partial_translations  jsonb;
begin
  if not is_admin() then
    raise exception 'get_curriculum_integrity_report: admin access required';
  end if;

  -- Stories not referenced by any missions.story_id
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',    s.id,
    'slug',  s.slug,
    'title', s.title
  ) order by s.slug), '[]'::jsonb)
  into v_orphaned_stories
  from stories s
  where not exists (
    select 1 from missions m where m.story_id = s.id
  );

  -- level_missions entries where the linked mission is active = false
  select coalesce(jsonb_agg(jsonb_build_object(
    'level_number',  lm.level_number,
    'unit_number',   lm.unit_number,
    'category_slug', lm.category_slug,
    'mission_id',    lm.mission_id
  ) order by lm.level_number, lm.unit_number, lm.category_slug), '[]'::jsonb)
  into v_inactive_slots
  from level_missions lm
  join missions m on m.id = lm.mission_id
  where m.active = false;

  -- Per (level, unit): which of the 8 canonical category slugs are absent
  -- from level_missions entirely.
  -- Only checks levels/units that have at least one slot defined.
  with known_units as (
    select distinct level_number, unit_number
    from level_missions
  ),
  expected as (
    select ku.level_number, ku.unit_number, c.slug as category_slug
    from known_units ku
    cross join unnest(array['morning','movement','artistic','histoire',
                             'zoom','discovery','flipflop','coloring']) as c(slug)
  ),
  present as (
    select level_number, unit_number, category_slug
    from level_missions
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'level_number',  e.level_number,
    'unit_number',   e.unit_number,
    'category_slug', e.category_slug
  ) order by e.level_number, e.unit_number, e.category_slug), '[]'::jsonb)
  into v_missing_slots
  from expected e
  where not exists (
    select 1 from present p
    where p.level_number = e.level_number
      and p.unit_number  = e.unit_number
      and p.category_slug = e.category_slug
  );

  -- Slots where the mission has fewer than 3 published language versions
  select coalesce(jsonb_agg(jsonb_build_object(
    'level_number',        lm.level_number,
    'unit_number',         lm.unit_number,
    'category_slug',       lm.category_slug,
    'published_languages', lang_counts.langs,
    'published_count',     lang_counts.cnt
  ) order by lm.level_number, lm.unit_number, lm.category_slug), '[]'::jsonb)
  into v_partial_translations
  from level_missions lm
  join missions m on m.id = lm.mission_id and m.active = true
  join lateral (
    select
      array_agg(mv.language order by mv.language) as langs,
      count(*) as cnt
    from mission_versions mv
    where mv.mission_id = lm.mission_id
      and mv.published = true
  ) lang_counts on true
  where lang_counts.cnt < 3;

  return jsonb_build_object(
    'orphaned_stories',      v_orphaned_stories,
    'inactive_slots',        v_inactive_slots,
    'missing_category_slots', v_missing_slots,
    'partial_translations',  v_partial_translations,
    'generated_at',          now()
  );
end;
$$;

grant execute on function get_curriculum_integrity_report() to authenticated;


-- ── 4. export_unit_content ───────────────────────────────────
create or replace function export_unit_content(p_level_number integer, p_unit_number integer)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_result jsonb;
begin
  if not is_admin() then
    raise exception 'export_unit_content: admin access required';
  end if;

  if p_level_number is null or p_level_number <= 0 then
    raise exception 'export_unit_content: p_level_number must be a positive integer';
  end if;

  if p_unit_number is null or p_unit_number <= 0 then
    raise exception 'export_unit_content: p_unit_number must be a positive integer';
  end if;

  -- Returns one row per (category, language) for all published versions
  -- in the unit. The shape matches the V2 bulk import row format so the
  -- output can be fed directly back into admin_bulk_import_missions for
  -- round-trip verification.
  select coalesce(jsonb_agg(row_obj order by lm.category_slug, mv.language), '[]'::jsonb)
  into v_result
  from level_missions lm
  join missions m on m.id = lm.mission_id
  join mission_versions mv
    on mv.mission_id = m.id
    and mv.published = true
  join lateral (
    select jsonb_build_object(
      'level_number',  lm.level_number,
      'unit_number',   lm.unit_number,
      'category_slug', lm.category_slug,
      'language',      mv.language,
      'title',         mv.title,
      'content_json',  mv.content_json,
      'status',        'draft'  -- import always as draft for safety
    ) as row_obj
  ) r on true
  where lm.level_number = p_level_number
    and lm.unit_number  = p_unit_number;

  return jsonb_build_object(
    'level_number', p_level_number,
    'unit_number',  p_unit_number,
    'rows',         v_result,
    'row_count',    jsonb_array_length(v_result),
    'exported_at',  now()
  );
end;
$$;

grant execute on function export_unit_content(integer, integer) to authenticated;
