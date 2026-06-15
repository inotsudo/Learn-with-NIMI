-- ============================================================
--  NIMIPIKO — Seed: Story 1 missions + extend type constraint
--  Run this in Supabase SQL Editor AFTER 001_initial_schema.sql
-- ============================================================

-- 1. Extend the missions.type constraint to include 'read'
--    (Shiny Readers = reading the story PDF, distinct from 'listen')
ALTER TABLE missions
  DROP CONSTRAINT IF EXISTS missions_type_check;

ALTER TABLE missions
  ADD CONSTRAINT missions_type_check
    CHECK (type IN ('listen', 'read', 'color', 'move', 'sing', 'watch'));


-- 2. Ensure the story row exists (safe to re-run)
INSERT INTO stories (slug, title, sort_order, is_active)
VALUES ('the-talking-faces', 'The Talking Faces', 1, true)
ON CONFLICT (slug) DO NOTHING;


-- 3. Insert one mission per step (day 1–6) for "The Talking Faces"
--    ON CONFLICT DO NOTHING means it is safe to re-run without duplicates.
INSERT INTO missions (story_id, day_number, type, title, duration_minutes)
VALUES
  ((SELECT id FROM stories WHERE slug = 'the-talking-faces'), 1, 'listen', 'Magic Stories with Nimi',  10),
  ((SELECT id FROM stories WHERE slug = 'the-talking-faces'), 2, 'read',   'Shiny Readers',             15),
  ((SELECT id FROM stories WHERE slug = 'the-talking-faces'), 3, 'color',  'Little Creators',           15),
  ((SELECT id FROM stories WHERE slug = 'the-talking-faces'), 4, 'move',   'Move & Groove',             10),
  ((SELECT id FROM stories WHERE slug = 'the-talking-faces'), 5, 'sing',   'Sing Along with Nimi',      10),
  ((SELECT id FROM stories WHERE slug = 'the-talking-faces'), 6, 'watch',  'Journey with Nimi',         15)
ON CONFLICT (story_id, day_number, type) DO NOTHING;


-- 4. Verify — you should see 6 rows
SELECT
  m.day_number,
  m.type,
  m.title,
  m.duration_minutes,
  s.slug AS story_slug
FROM missions m
JOIN stories  s ON s.id = m.story_id
ORDER BY m.day_number;
