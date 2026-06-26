-- ============================================================
--  NIMIPIKO — Rollback SA-1.1 Story Adventure Schema
--
--  Reverses ONLY migration 043. Preserves all pre-existing data.
--  Safe to run on production — removes only Story Adventure additions.
--
--  WARNING: Run this ONLY if 043 needs to be rolled back.
--  Do NOT run if story_versions/story_slots contain production data.
-- ============================================================


-- ── 1. DROP NEW TABLES (reverse creation order) ──────────────

-- Progress/child tables first, then content tables
drop table if exists personalized_stories cascade;
drop table if exists weekly_challenge_progress cascade;
drop table if exists weekly_challenge_versions cascade;
drop table if exists weekly_challenges cascade;
drop table if exists story_intro_progress cascade;
drop table if exists story_slots cascade;
drop table if exists story_versions cascade;


-- ── 2. DROP TRIGGER FUNCTIONS ────────────────────────────────

drop trigger if exists stories_sync_is_active_trigger on stories;
drop function if exists stories_sync_is_active();

drop function if exists story_versions_sync_published();
drop function if exists weekly_challenge_versions_sync_published();


-- ── 3. REMOVE STORIES TABLE EXTENSIONS ───────────────────────

-- Drop constraints first
alter table stories drop constraint if exists stories_status_check;
alter table stories drop constraint if exists stories_age_min_check;
alter table stories drop constraint if exists stories_age_max_check;
alter table stories drop constraint if exists stories_age_range_check;

-- Drop indexes
drop index if exists idx_stories_status;
drop index if exists idx_stories_sort_order;
drop index if exists idx_stories_scheduled_publish;

-- Drop columns (restores stories to pre-043 state)
alter table stories drop column if exists status;
alter table stories drop column if exists age_min;
alter table stories drop column if exists age_max;
alter table stories drop column if exists scheduled_publish_at;
alter table stories drop column if exists published_at;
alter table stories drop column if exists retired_at;


-- ============================================================
--  After rollback:
--  - stories table returns to original columns (id, slug, title,
--    cover_url, sort_order, is_active, theme_title, theme_emoji,
--    created_at)
--  - is_active reverts to manually-set boolean (no trigger)
--  - All 6 new tables removed
--  - All existing data (child_progress, child_achievements,
--    missions, story_pages, etc.) UNCHANGED
-- ============================================================
