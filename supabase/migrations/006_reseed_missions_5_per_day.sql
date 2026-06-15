-- ============================================================
--  NIMIPIKO — Re-seed: 5 missions per day × 6 days
--  Each day has: Morning Song · Video Activity · Storybook
--                Coloring Book · Story PDF
--
--  Run AFTER: 005_add_mission_category.sql
-- ============================================================

DO $$
DECLARE
  v_story_id uuid;
  v_day      integer;
BEGIN
  SELECT id INTO v_story_id FROM stories WHERE slug = 'the-talking-faces';
  IF v_story_id IS NULL THEN
    RAISE EXCEPTION 'Story not found — run 002_seed_missions.sql first';
  END IF;

  -- Remove old single-mission-per-day rows first (safe re-run)
  DELETE FROM missions WHERE story_id = v_story_id;

  -- Insert 5 missions for each of the 6 days
  FOR v_day IN 1..6 LOOP

    -- 1. Morning Song
    INSERT INTO missions
      (story_id, day_number, type, title, duration_minutes, category, media_url)
    VALUES
      (v_story_id, v_day, 'sing', 'Morning Song', 5, 'morning',
       'storyBook/song.mp3');

    -- 2. Video Activity
    INSERT INTO missions
      (story_id, day_number, type, title, duration_minutes, category, media_url)
    VALUES
      (v_story_id, v_day, 'move', 'Video Activity', 10, 'movement',
       'storyBook/move-groove-web.mp4');

    -- 3. Storybook (flipbook)
    INSERT INTO missions
      (story_id, day_number, type, title, duration_minutes, category,
       page_start, page_end)
    VALUES
      (v_story_id, v_day, 'listen', 'Storybook', 10, 'discovery',
       1, 21);

    -- 4. Coloring Book
    INSERT INTO missions
      (story_id, day_number, type, title, duration_minutes, category,
       page_start, page_end)
    VALUES
      (v_story_id, v_day, 'color', 'Coloring Book', 15, 'artistic',
       1, 10);

    -- 5. Story PDF
    INSERT INTO missions
      (story_id, day_number, type, title, duration_minutes, category, media_url,
       page_start, page_end)
    VALUES
      (v_story_id, v_day, 'read', 'Story PDF', 10, 'afternoon',
       'storyBook/story-web.pdf', 1, 21);

  END LOOP;

END $$;


-- ── Verify (should show 30 rows, 5 per day) ──────────────────
SELECT day_number, category, type, title, media_url
FROM missions
WHERE story_id = (SELECT id FROM stories WHERE slug = 'the-talking-faces')
ORDER BY day_number, category;
