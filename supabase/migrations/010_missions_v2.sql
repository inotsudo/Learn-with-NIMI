-- ============================================================
--  NIMIPIKO — 010: Unified Dynamic Mission Container (v2)
--
--  Adds the columns the new /missions/[category] route needs to
--  render ANY mission type purely from data (admin-editable):
--    - subtitle : short line shown under the mission title
--    - tip_text : "Nimi Says" banner message
--    - content  : jsonb bag for type-specific extras
--                  (sing -> {lyrics:[...]}, move -> {prompts:[...]})
--
--  Then replaces the 6-mission/day_number seed (008) with 8 rows,
--  one per ActivityCategory (app/_activityData.ts), each carrying
--  its own type/title/subtitle/stars/media/tip/content.
--
--  Defensive: re-applies the `stars` column + type/category CHECKs
--  in case 008/009 have not run yet. Safe to re-run.
--
--  NOT RUN YET — written for review only (live missions/stories
--  tables are currently empty; see migration_offers_pending memory).
-- ============================================================

-- ── New columns ─────────────────────────────────────────────
ALTER TABLE missions ADD COLUMN IF NOT EXISTS stars integer DEFAULT 10;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS subtitle text;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS tip_text text;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS content jsonb DEFAULT '{}'::jsonb;

-- ── type CHECK: allow 'story' (used by the flipflop mission) ─
ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_type_check;
ALTER TABLE missions ADD CONSTRAINT missions_type_check
  CHECK (type IN ('listen','read','color','move','sing','watch','story','quiz','find'));

-- ── category CHECK: exactly the 8 ActivityCategory values ────
ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_category_check;
ALTER TABLE missions ADD CONSTRAINT missions_category_check
  CHECK (category IN ('morning','movement','artistic','histoire','zoom','discovery','flipflop','coloring'));

DO $$
DECLARE
  v_story_id uuid;
BEGIN
  SELECT id INTO v_story_id FROM stories WHERE slug = 'the-talking-faces';
  IF v_story_id IS NULL THEN
    RAISE EXCEPTION 'Story not found — run 002_seed_missions.sql first';
  END IF;

  -- Replace the 6-mission/day_number seed (008) with 8 category rows —
  -- one per Daily Adventure card, addressed by /missions/[category].
  DELETE FROM missions WHERE story_id = v_story_id;

  -- 1. morning — Sing Along with Nimi (sing)
  INSERT INTO missions
    (story_id, day_number, type, title, subtitle, duration_minutes, category,
     media_url, stars, tip_text, content)
  VALUES
    (v_story_id, 1, 'sing', 'Sing Along with Nimi', 'Morning Song', 10, 'morning',
     'storyBook/song.mp3', 10,
     'Singing every morning helps you remember new words!',
     '{"lyrics": [
        "Good morning, sunshine,",
        "Good morning, world!",
        "Wake up, Nimi,",
        "Wake up, Piko too!",
        "It''s a brand new day,",
        "Let''s sing and play!"
     ]}'::jsonb);

  -- 2. movement — Move & Groove (move)
  INSERT INTO missions
    (story_id, day_number, type, title, subtitle, duration_minutes, category,
     media_url, stars, tip_text, content)
  VALUES
    (v_story_id, 2, 'move', 'Move & Groove', 'Dance with Nimi', 10, 'movement',
     'storyBook/move-groove-web.mp4', 10,
     'Moving your body helps your brain grow strong!',
     '{"prompts": [
        {"emoji": "👏", "label": "CLAP your hands!"},
        {"emoji": "🦵", "label": "JUMP up high!"},
        {"emoji": "🤗", "label": "GIVE a big hug!"},
        {"emoji": "🌀", "label": "SPIN around!"}
     ]}'::jsonb);

  -- 3. artistic — Little Creators (color)
  INSERT INTO missions
    (story_id, day_number, type, title, subtitle, duration_minutes, category,
     stars, tip_text)
  VALUES
    (v_story_id, 3, 'color', 'Little Creators', 'Bring the story to life with colors!', 15, 'artistic',
     15, 'Use your favorite colors to make the story shine!');

  -- 4. histoire — Mission Historique (watch)
  INSERT INTO missions
    (story_id, day_number, type, title, subtitle, duration_minutes, category,
     media_url, stars, tip_text)
  VALUES
    (v_story_id, 4, 'watch', 'Mission Historique', 'Discover the story of Rwanda', 15, 'histoire',
     'storyBook/journey-web.mp4', 15,
     'History helps us understand where we come from!');

  -- 5. zoom — Mission Zoom (watch)
  INSERT INTO missions
    (story_id, day_number, type, title, subtitle, duration_minutes, category,
     media_url, stars, tip_text)
  VALUES
    (v_story_id, 5, 'watch', 'Mission Zoom', 'Look closer at the world around you', 15, 'zoom',
     'storyBook/journey-web.mp4', 15,
     'Zoom in close — what new details can you find?');

  -- 6. discovery — Shiny Readers (read)
  INSERT INTO missions
    (story_id, day_number, type, title, subtitle, duration_minutes, category,
     media_url, stars, tip_text)
  VALUES
    (v_story_id, 6, 'read', 'Shiny Readers', 'Read together with your family!', 15, 'discovery',
     'storyBook/story-web.pdf', 10,
     'Reading every day makes you smarter and stronger!');

  -- 7. flipflop — Magic Stories with Nimi (story / flipbook)
  INSERT INTO missions
    (story_id, day_number, type, title, subtitle, duration_minutes, category,
     stars, tip_text)
  VALUES
    (v_story_id, 7, 'story', 'Magic Stories with Nimi', 'Open your FlipFlop storybook', 10, 'flipflop',
     10, 'Every story has a magic lesson hidden inside!');

  -- 8. coloring — Color Your Story (color)
  INSERT INTO missions
    (story_id, day_number, type, title, subtitle, duration_minutes, category,
     stars, tip_text)
  VALUES
    (v_story_id, 8, 'color', 'Color Your Story', 'Color the characters from today''s story', 10, 'coloring',
     10, 'There''s no wrong way to color — be creative!');

END $$;


-- ── Verify (should show exactly 8 rows) ──────────────────────────
SELECT day_number, category, type, title, subtitle, stars, media_url
FROM missions
WHERE story_id = (SELECT id FROM stories WHERE slug = 'the-talking-faces')
ORDER BY day_number;
1. every