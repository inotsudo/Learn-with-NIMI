-- ============================================================
--  NIMIPIKO — Fix: 1 mission per step (6 total)
--
--  This replaces the multi-mission-per-day structure with the
--  correct structure: exactly 1 mission per day_number (1–6),
--  each matching its step page and carrying the right category
--  so MissionsComponent displays it in the correct section.
--
--  Step → day_number → type → category → step page
--  ─────────────────────────────────────────────────
--  1. Magic Stories   → 1 → listen → histoire  → /missions/magic-stories
--  2. Shiny Readers   → 2 → read   → afternoon → /missions/shiny-readers
--  3. Little Creators → 3 → color  → artistic  → /missions/little-creators
--  4. Move & Groove   → 4 → move   → movement  → /missions/move-groove
--  5. Sing Along      → 5 → sing   → morning   → /missions/sing-along
--  6. Journey         → 6 → watch  → afternoon → /missions/journey
--
--  Run AFTER: 005_add_mission_category.sql (which adds the
--  category column). Safe to re-run.
-- ============================================================

DO $$
DECLARE
  v_story_id uuid;
BEGIN
  SELECT id INTO v_story_id FROM stories WHERE slug = 'the-talking-faces';
  IF v_story_id IS NULL THEN
    RAISE EXCEPTION 'Story not found — run 002_seed_missions.sql first';
  END IF;

  -- Remove all current missions for this story
  DELETE FROM missions WHERE story_id = v_story_id;

  -- Restore type constraint to the original 6 types (no 'story')
  ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_type_check;
  ALTER TABLE missions ADD CONSTRAINT missions_type_check
    CHECK (type IN ('listen', 'read', 'color', 'move', 'sing', 'watch'));

  -- ── Step 1: Magic Stories with Nimi (flipbook reader) ──────────
  INSERT INTO missions
    (story_id, day_number, type, title, duration_minutes, category,
     page_start, page_end)
  VALUES
    (v_story_id, 1, 'listen', 'Magic Stories with Nimi', 10, 'histoire',
     1, 21);

  -- ── Step 2: Shiny Readers (PDF story) ──────────────────────────
  INSERT INTO missions
    (story_id, day_number, type, title, duration_minutes, category,
     media_url, page_start, page_end)
  VALUES
    (v_story_id, 2, 'read', 'Shiny Readers', 15, 'afternoon',
     'storyBook/story-web.pdf', 1, 21);

  -- ── Step 3: Little Creators (coloring pages) ───────────────────
  INSERT INTO missions
    (story_id, day_number, type, title, duration_minutes, category,
     page_start, page_end)
  VALUES
    (v_story_id, 3, 'color', 'Little Creators', 15, 'artistic',
     1, 10);

  -- ── Step 4: Move & Groove (dance video) ────────────────────────
  INSERT INTO missions
    (story_id, day_number, type, title, duration_minutes, category,
     media_url)
  VALUES
    (v_story_id, 4, 'move', 'Move & Groove', 10, 'movement',
     'storyBook/move-groove-web.mp4');

  -- ── Step 5: Sing Along with Nimi (audio song) ──────────────────
  INSERT INTO missions
    (story_id, day_number, type, title, duration_minutes, category,
     media_url)
  VALUES
    (v_story_id, 5, 'sing', 'Sing Along with Nimi', 10, 'morning',
     'storyBook/song.mp3');

  -- ── Step 6: Journey with Nimi (animated video) ─────────────────
  INSERT INTO missions
    (story_id, day_number, type, title, duration_minutes, category,
     media_url)
  VALUES
    (v_story_id, 6, 'watch', 'Journey with Nimi', 15, 'afternoon',
     'storyBook/journey-web.mp4');

END $$;


-- ── Verify (should show exactly 6 rows) ──────────────────────────
SELECT day_number, type, category, title, media_url, page_start, page_end
FROM missions
WHERE story_id = (SELECT id FROM stories WHERE slug = 'the-talking-faces')
ORDER BY day_number;
