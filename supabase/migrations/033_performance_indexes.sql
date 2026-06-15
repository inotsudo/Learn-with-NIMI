-- ============================================================
--  Phase BK — Production Hardening: performance indexes
--
--  mission_versions(mission_id) and story_page_versions(story_page_id)
--  are joined heavily (get_daily_missions, get_curriculum_missions,
--  complete_curriculum_mission, story readers) but only carry their
--  UNIQUE (col, language) constraint index, which is less efficient for
--  single-column lookups. Purely additive, no RLS/data changes.
-- ============================================================

create index if not exists idx_mission_versions_mission_id
  on mission_versions (mission_id);

create index if not exists idx_story_page_versions_story_page_id
  on story_page_versions (story_page_id);
