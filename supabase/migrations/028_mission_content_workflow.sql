-- ============================================================
-- Migration 028: Mission Content Workflow (Draft/Review/Published/Archived)
--
-- Adds a 4-state content lifecycle to mission_versions, additive to the
-- existing `published` boolean. All curriculum/daily-mission RPCs
-- (get_daily_missions, get_curriculum_missions, complete_mission,
-- complete_curriculum_mission, category_effective_language) keep reading
-- `published` unchanged. A trigger derives `published` from `status`:
--   draft     -> published = false
--   review    -> published = false
--   published -> published = true
--   archived  -> published = false
-- Existing rows backfill status from their current `published` value, so
-- "Review" and "Archived" are new hidden states, while "Published" yields
-- exactly the same visibility as before.
--
-- Also adds an admin-write RLS policy on level_missions (created in
-- migration 026 with read-only RLS) so the new Level Editor admin UI can
-- create/update/delete level_missions rows, following the admin-bypass
-- pattern established in migration 013.
-- ============================================================

-- ── 1. mission_versions.status ──────────────────────────────
alter table mission_versions
  add column if not exists status text not null default 'draft'
  check (status in ('draft', 'review', 'published', 'archived'));

-- ── 2. sync trigger: status -> published ────────────────────
create or replace function sync_mission_version_published()
returns trigger
language plpgsql
as $$
begin
  new.published := (new.status = 'published');
  return new;
end;
$$;

drop trigger if exists trg_sync_mission_version_published on mission_versions;
create trigger trg_sync_mission_version_published
  before insert or update on mission_versions
  for each row execute function sync_mission_version_published();

-- ── 3. Backfill existing rows (runs through the trigger above,
--      so published stays consistent with status) ─────────────
update mission_versions
  set status = case when published then 'published' else 'draft' end;

-- ── 4. level_missions admin-write policy ─────────────────────
drop policy if exists "admin: full access" on level_missions;
create policy "admin: full access" on level_missions
  for all using (is_admin()) with check (is_admin());
