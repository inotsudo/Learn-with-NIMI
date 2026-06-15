-- ============================================================
--  Drop unused columns from story_pages
-- ============================================================
ALTER TABLE story_pages
  DROP COLUMN IF EXISTS text,
  DROP COLUMN IF EXISTS duration_seconds;
