-- Migration 040: admin_bulk_import_missions V2
--
-- Replaces the 12-column import schema with a 7-column content-editor-friendly
-- format: level, unit, category, language, title, content, status.
--
-- Key changes vs migration 038:
--   • level_number + unit_number are now REQUIRED (no orphan guarantee:
--     every row always writes level_missions)
--   • sequence auto-assigned (max+1 per category) — not a client field
--   • type derived from categories.default_type — not a client field
--   • stars / duration_minutes always default 10 / 10
--   • content_json (was optional, default {}) is now REQUIRED
--   • status is now a required field (draft/review/published); previously
--     all new versions were hardcoded to 'draft'
--   • status='published' path demotes any existing published sibling to
--     'archived' before updating, preserving the one-published-per-
--     (mission_id, language) partial-unique-index invariant
--   • missions.active synced after every version mutation
--   • revisions_created dropped from return (V2 overwrites is_current row
--     directly; no draft-revision staging)
--   • Return gains level_missions_linked count
--
-- Backward-compat note: function signature is unchanged
--   (admin_bulk_import_missions(p_rows jsonb) → jsonb), so no client-side
--   RPC call change is required beyond the new row key shape.

create or replace function admin_bulk_import_missions(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row                   jsonb;
  v_idx                   integer;
  v_level_number          integer;
  v_unit_number           integer;
  v_category_slug         text;
  v_language              text;
  v_title                 text;
  v_content_json          jsonb;
  v_status                text;
  v_sequence              integer;
  v_type                  text;
  v_key                   text;
  v_seen_keys             text[] := '{}';
  v_mission_id            uuid;
  v_version_id            uuid;
  v_missions_created      integer := 0;
  v_level_missions_linked integer := 0;
  v_versions_created      integer := 0;
  v_versions_updated      integer := 0;
begin
  if not is_admin() then
    raise exception 'admin_bulk_import_missions: admin access required';
  end if;

  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'admin_bulk_import_missions: p_rows must be a JSON array';
  end if;

  -- ── Pass 1: validate entire batch before writing anything ──────────────
  v_idx := 0;
  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    v_level_number  := (v_row->>'level_number')::integer;
    v_unit_number   := (v_row->>'unit_number')::integer;
    v_category_slug := v_row->>'category_slug';
    v_language      := v_row->>'language';
    v_title         := v_row->>'title';
    v_content_json  := v_row->'content_json';
    v_status        := v_row->>'status';

    -- level_number: required, must exist
    if v_level_number is null or v_level_number <= 0 then
      raise exception 'Row %: level_number must be a positive integer', v_idx;
    end if;
    if not exists (select 1 from curriculum_levels where level_number = v_level_number) then
      raise exception 'Row %: unknown level_number %', v_idx, v_level_number;
    end if;

    -- unit_number: required positive integer
    if v_unit_number is null or v_unit_number <= 0 then
      raise exception 'Row %: unit_number must be a positive integer', v_idx;
    end if;

    -- category_slug: required, must exist in categories
    if v_category_slug is null or not exists (select 1 from categories where slug = v_category_slug) then
      raise exception 'Row %: unknown category_slug "%"', v_idx, coalesce(v_category_slug, '(missing)');
    end if;

    -- language
    if v_language is null or v_language not in ('en', 'fr', 'rw') then
      raise exception 'Row %: invalid language "%"', v_idx, coalesce(v_language, '(missing)');
    end if;

    -- title
    if coalesce(trim(v_title), '') = '' then
      raise exception 'Row %: title is required', v_idx;
    end if;

    -- content_json: required, must be a JSON object
    if v_content_json is null then
      raise exception 'Row %: content is required', v_idx;
    end if;
    if jsonb_typeof(v_content_json) is distinct from 'object' then
      raise exception 'Row %: content must be a JSON object', v_idx;
    end if;

    -- status: required, draft/review/published only
    if v_status is null or v_status not in ('draft', 'review', 'published') then
      raise exception 'Row %: status must be draft, review, or published (got "%")',
        v_idx, coalesce(v_status, '(missing)');
    end if;

    -- duplicate detection within batch
    v_key := v_category_slug || ':' || v_level_number::text || ':' || v_unit_number::text || ':' || v_language;
    if v_key = any(v_seen_keys) then
      raise exception 'Row %: duplicate (category, level, unit, language) combination "%"', v_idx, v_key;
    end if;
    v_seen_keys := array_append(v_seen_keys, v_key);

    v_idx := v_idx + 1;
  end loop;

  -- ── Pass 2: write (find-or-create mission, upsert slot, upsert version) ─
  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    v_level_number  := (v_row->>'level_number')::integer;
    v_unit_number   := (v_row->>'unit_number')::integer;
    v_category_slug := v_row->>'category_slug';
    v_language      := v_row->>'language';
    v_title         := v_row->>'title';
    v_content_json  := v_row->'content_json';
    v_status        := v_row->>'status';

    -- ── Step A: resolve mission via slot; create if absent ────────────────
    select mission_id into v_mission_id
      from level_missions
      where level_number  = v_level_number
        and unit_number   = v_unit_number
        and category_slug = v_category_slug;

    if v_mission_id is null then
      -- auto-assign next sequence within this category
      select coalesce(max(sequence), 0) + 1 into v_sequence
        from missions where category_slug = v_category_slug;
      -- derive type from category default
      select default_type into v_type from categories where slug = v_category_slug;
      insert into missions (category_slug, sequence, type, stars, duration_minutes, active)
      values (v_category_slug, v_sequence, v_type, 10, 10, false)
      returning id into v_mission_id;
      v_missions_created := v_missions_created + 1;
    end if;

    -- ── Step B: always upsert level_missions (no-orphan guarantee) ────────
    insert into level_missions (level_number, unit_number, category_slug, mission_id)
    values (v_level_number, v_unit_number, v_category_slug, v_mission_id)
    on conflict (level_number, unit_number, category_slug)
      do update set mission_id = excluded.mission_id;
    v_level_missions_linked := v_level_missions_linked + 1;

    -- ── Step C: upsert mission_versions ───────────────────────────────────
    select id into v_version_id
      from mission_versions
      where mission_id = v_mission_id
        and language   = v_language
        and is_current = true;

    if v_version_id is null then
      -- No existing is_current row: simple insert.
      -- trg_sync_mission_version_published fires and sets published=(status='published').
      insert into mission_versions (mission_id, language, title, content_json, status)
      values (v_mission_id, v_language, v_title, v_content_json, v_status);
      v_versions_created := v_versions_created + 1;
    else
      -- Existing is_current row found.
      if v_status = 'published' then
        -- Demote any OTHER published sibling first to satisfy
        -- the mission_versions_one_published_idx partial unique index.
        update mission_versions
          set status = 'archived', is_current = false
          where mission_id = v_mission_id
            and language   = v_language
            and id        <> v_version_id
            and published  = true;
      end if;
      update mission_versions
        set title        = v_title,
            content_json = v_content_json,
            status       = v_status
        where id = v_version_id;
      v_versions_updated := v_versions_updated + 1;
    end if;

    -- ── Step D: sync missions.active ──────────────────────────────────────
    update missions
      set active = exists (
        select 1 from mission_versions
        where mission_id = v_mission_id and published = true
      )
      where id = v_mission_id;
  end loop;

  return jsonb_build_object(
    'missions_created',      v_missions_created,
    'level_missions_linked', v_level_missions_linked,
    'versions_created',      v_versions_created,
    'versions_updated',      v_versions_updated
  );
end;
$$;

grant execute on function admin_bulk_import_missions(jsonb) to authenticated;
