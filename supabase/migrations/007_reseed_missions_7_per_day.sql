-- ============================================================
--  NIMIPIKO — Re-seed: 7 missions per day × 6 days
--
--  Sections (in display order):
--    1. Mission Histoire  (histoire / story)
--    2. Morning Song      (morning  / sing)
--    3. Mission Discovery (discovery / listen)
--    4. Mission Movement  (movement  / move)
--    5. Mission Zoom      (afternoon / watch)
--    6. Mission Artistique(artistic  / color)
--    7. PDF Story         (afternoon / read)
--  + 2 automatic BookCards from story_pages / coloring_pages tables
--
--  Run AFTER: 006_reseed_missions_5_per_day.sql
-- ============================================================

-- 1. Extend type constraint to include 'story'
ALTER TABLE missions
  DROP CONSTRAINT IF EXISTS missions_type_check;

ALTER TABLE missions
  ADD CONSTRAINT missions_type_check
    CHECK (type IN ('listen', 'read', 'color', 'move', 'sing', 'watch', 'story'));


-- 2. Re-seed
DO $$
DECLARE
  v_story_id uuid;
  v_day      integer;
BEGIN
  SELECT id INTO v_story_id FROM stories WHERE slug = 'the-talking-faces';
  IF v_story_id IS NULL THEN
    RAISE EXCEPTION 'Story not found — run 002_seed_missions.sql first';
  END IF;

  DELETE FROM missions WHERE story_id = v_story_id;

  FOR v_day IN 1..6 LOOP

    -- 1. Mission Histoire  (story video)
    INSERT INTO missions
      (story_id, day_number, type, title, duration_minutes, category, media_url)
    VALUES
      (v_story_id, v_day, 'story', 'Mission Histoire', 10, 'histoire',
       'storyBook/journey-web.mp4');

    -- 2. Morning Song
    INSERT INTO missions
      (story_id, day_number, type, title, duration_minutes, category, media_url)
    VALUES
      (v_story_id, v_day, 'sing', 'Morning Song', 5, 'morning',
       'storyBook/song.mp3');

    -- 3. Mission Discovery  (storybook completion tracker)
    INSERT INTO missions
      (story_id, day_number, type, title, duration_minutes, category,
       page_start, page_end)
    VALUES
      (v_story_id, v_day, 'listen', 'Mission Discovery', 10, 'discovery',
       1, 21);

    -- 4. Mission Movement  (dance/activity video)
    INSERT INTO missions
      (story_id, day_number, type, title, duration_minutes, category, media_url)
    VALUES
      (v_story_id, v_day, 'move', 'Mission Movement', 10, 'movement',
       'storyBook/move-groove-web.mp4');

    -- 5. Mission Zoom
    INSERT INTO missions
      (story_id, day_number, type, title, duration_minutes, category)
    VALUES
      (v_story_id, v_day, 'watch', 'Mission Zoom', 15, 'afternoon');

    -- 6. Mission Artistique  (coloring completion tracker)
    INSERT INTO missions
      (story_id, day_number, type, title, duration_minutes, category,
       page_start, page_end)
    VALUES
      (v_story_id, v_day, 'color', 'Mission Artistique', 15, 'artistic',
       1, 10);

    -- 7. PDF Story
    INSERT INTO missions
      (story_id, day_number, type, title, duration_minutes, category, media_url,
       page_start, page_end)
    VALUES
      (v_story_id, v_day, 'read', 'PDF Story', 10, 'afternoon',
       'storyBook/story-web.pdf', 1, 21);

  END LOOP;
END $$;


-- ── Verify (should show 42 rows, 7 per day) ──────────────────
SELECT day_number, category, type, title, media_url
FROM missions
WHERE story_id = (SELECT id FROM stories WHERE slug = 'the-talking-faces')
ORDER BY day_number,
  CASE category
    WHEN 'histoire'  THEN 1
    WHEN 'morning'   THEN 2
    WHEN 'discovery' THEN 3
    WHEN 'movement'  THEN 4
    WHEN 'artistic'  THEN 5
    WHEN 'afternoon' THEN 6
    ELSE 7
  END;
