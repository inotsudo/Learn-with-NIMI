-- ============================================================
--  NIMIPIKO — 009: Dashboard theme fields + mission stars
--
--  Additive-only prep for the "Today's Adventure" dashboard.
--  Does NOT delete or reseed any rows. Safe regardless of
--  whether earlier seed migrations (002/006/007/008) have run.
--
--  - stories.theme_title / theme_emoji: powers the
--    "Theme: {title} {emoji}" banner (falls back to a constant
--    in app/_activityData.ts if NULL).
--  - missions.stars: reward value shown on activity cards
--    (falls back to app/_activityData.ts default if NULL).
--  - missions.type CHECK: extended with 'story' | 'quiz' | 'find'
--    for the 3 new activity types Phase 2B will introduce
--    (Mission Historique, Mission Zoom, Mission Discovery).
--    Adding the values now is harmless even if unused yet.
-- ============================================================

ALTER TABLE stories ADD COLUMN IF NOT EXISTS theme_title text;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS theme_emoji text;

UPDATE stories
SET theme_title = COALESCE(theme_title, 'The Lion King of Rwanda'),
    theme_emoji = COALESCE(theme_emoji, '🦁')
WHERE slug = 'the-talking-faces';

ALTER TABLE missions ADD COLUMN IF NOT EXISTS stars integer DEFAULT 10;

ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_type_check;
ALTER TABLE missions ADD CONSTRAINT missions_type_check
  CHECK (type IN ('listen','read','color','move','sing','watch','story','quiz','find'));
