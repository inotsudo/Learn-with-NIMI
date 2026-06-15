-- ============================================================
-- Migration 029: admin_bulk_import_missions RPC
--
-- Lets admins bulk-create/update missions + mission_versions from a
-- parsed CSV/XLSX file (see app/admin/BulkImportManager.tsx). All-or-
-- nothing: the first validation failure raises (with the 0-based row
-- index and a human-readable message), rolling back the whole call.
--
-- p_rows: jsonb array of objects with keys
--   category_slug, sequence, type, stars, duration_minutes,
--   language, title, subtitle, tip_text, media_url, content_json
--
-- New missions are created with active=false (same safe default as
-- MissionManager.handleCreate). New mission_versions are created with
-- status='draft' (published=false via migration 028's trigger).
-- Re-importing an existing (mission, language) pair only updates content
-- fields — status/published are left untouched so a re-import can't
-- silently publish or unpublish live content.
-- ============================================================

create or replace function admin_bulk_import_missions(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row              jsonb;
  v_idx              integer;
  v_category_slug    text;
  v_sequence         integer;
  v_type             text;
  v_stars            integer;
  v_duration         integer;
  v_language         text;
  v_title            text;
  v_subtitle         text;
  v_tip_text         text;
  v_media_url        text;
  v_content_json     jsonb;
  v_key              text;
  v_seen_keys        text[] := '{}';
  v_mission_id       uuid;
  v_version_id       uuid;
  v_missions_created integer := 0;
  v_versions_created integer := 0;
  v_versions_updated integer := 0;
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

    v_key := v_category_slug || ':' || v_sequence::text || ':' || v_language;
    if v_key = any(v_seen_keys) then
      raise exception 'Row %: duplicate (category_slug, sequence, language) combination % within this batch', v_idx, v_key;
    end if;
    v_seen_keys := array_append(v_seen_keys, v_key);

    v_idx := v_idx + 1;
  end loop;

  -- ── Pass 2: find-or-create missions, upsert mission_versions ──
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

    select id into v_mission_id from missions
      where category_slug = v_category_slug and sequence = v_sequence;

    if v_mission_id is null then
      insert into missions (category_slug, sequence, type, stars, duration_minutes, active)
      values (v_category_slug, v_sequence, v_type, coalesce(v_stars, 10), coalesce(v_duration, 10), false)
      returning id into v_mission_id;
      v_missions_created := v_missions_created + 1;
    end if;

    select id into v_version_id from mission_versions
      where mission_id = v_mission_id and language = v_language;

    if v_version_id is null then
      insert into mission_versions (mission_id, language, title, subtitle, tip_text, media_url, content_json, status)
      values (v_mission_id, v_language, v_title, v_subtitle, v_tip_text, v_media_url, coalesce(v_content_json, '{}'::jsonb), 'draft');
      v_versions_created := v_versions_created + 1;
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
    'versions_updated', v_versions_updated
  );
end;
$$;

grant execute on function admin_bulk_import_missions(jsonb) to authenticated;
