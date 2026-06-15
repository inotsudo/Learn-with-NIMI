-- ============================================================
--  NIMIPIKO — Story Content: "The Talking Faces"
--  Bucket: storyBook (PUBLIC)
--    Images  → storyBook/Book_1/page-01.png  … page-21.png
--    Audio   → storyBook/Audio_1/page-02.mp3 … (even pages + 21)
--
--  Run AFTER: 001_initial_schema.sql, 002_seed_missions.sql
-- ============================================================

DO $$
DECLARE
  v_story_id uuid;
BEGIN
  SELECT id INTO v_story_id FROM stories WHERE slug = 'the-talking-faces';
  IF v_story_id IS NULL THEN
    RAISE EXCEPTION 'Story not found — run 002_seed_missions.sql first';
  END IF;


  -- ── STORY PAGES (21 pages) ────────────────────────────────
  --  Odd pages (01,03,05…19) have no audio yet → audio_url NULL
  --  Even pages + page 21 have audio.
  --
  --  ← FILL IN the "text" value for each page with the actual story text.
  --  ← FILL IN duration_seconds with the real audio clip length (in seconds).

  INSERT INTO story_pages (story_id, page_number, image_url, audio_url)
  VALUES
    (v_story_id,  1, 'storyBook/Book_1/page-01.png', NULL),
    (v_story_id,  2, 'storyBook/Book_1/page-02.png', 'storyBook/Audio_1/page-02.mp3'),
    (v_story_id,  3, 'storyBook/Book_1/page-03.png', NULL),
    (v_story_id,  4, 'storyBook/Book_1/page-04.png', 'storyBook/Audio_1/page-04.mp3'),
    (v_story_id,  5, 'storyBook/Book_1/page-05.png', NULL),
    (v_story_id,  6, 'storyBook/Book_1/page-06.png', 'storyBook/Audio_1/page-06.mp3'),
    (v_story_id,  7, 'storyBook/Book_1/page-07.png', NULL),
    (v_story_id,  8, 'storyBook/Book_1/page-08.png', 'storyBook/Audio_1/page-08.mp3'),
    (v_story_id,  9, 'storyBook/Book_1/page-09.png', NULL),
    (v_story_id, 10, 'storyBook/Book_1/page-10.png', 'storyBook/Audio_1/page-10.mp3'),
    (v_story_id, 11, 'storyBook/Book_1/page-11.png', NULL),
    (v_story_id, 12, 'storyBook/Book_1/page-12.png', 'storyBook/Audio_1/page-12.mp3'),
    (v_story_id, 13, 'storyBook/Book_1/page-13.png', NULL),
    (v_story_id, 14, 'storyBook/Book_1/page-14.png', 'storyBook/Audio_1/page-14.mp3'),
    (v_story_id, 15, 'storyBook/Book_1/page-15.png', NULL),
    (v_story_id, 16, 'storyBook/Book_1/page-16.png', 'storyBook/Audio_1/page-16.mp3'),
    (v_story_id, 17, 'storyBook/Book_1/page-17.png', NULL),
    (v_story_id, 18, 'storyBook/Book_1/page-18.png', 'storyBook/Audio_1/page-18.mp3'),
    (v_story_id, 19, 'storyBook/Book_1/page-19.png', NULL),
    (v_story_id, 20, 'storyBook/Book_1/page-20.png', 'storyBook/Audio_1/page-20.mp3'),
    (v_story_id, 21, 'storyBook/Book_1/page-21.png', 'storyBook/Audio_1/page-21.mp3')
  ON CONFLICT (story_id, page_number) DO UPDATE
    SET image_url = EXCLUDED.image_url,
        audio_url = EXCLUDED.audio_url;


  -- ── COLORING PAGES ───────────────────────────────────────
  --  Bucket: Coloriage / Folder: Book_1 / Files: page-01.png … page-10.png

  INSERT INTO coloring_pages (story_id, page_number, template_image_url)
  VALUES
    (v_story_id,  1, 'Coloriage/Book_1/page-01.png'),
    (v_story_id,  2, 'Coloriage/Book_1/page-02.png'),
    (v_story_id,  3, 'Coloriage/Book_1/page-03.png'),
    (v_story_id,  4, 'Coloriage/Book_1/page-04.png'),
    (v_story_id,  5, 'Coloriage/Book_1/page-05.png'),
    (v_story_id,  6, 'Coloriage/Book_1/page-06.png'),
    (v_story_id,  7, 'Coloriage/Book_1/page-07.png'),
    (v_story_id,  8, 'Coloriage/Book_1/page-08.png'),
    (v_story_id,  9, 'Coloriage/Book_1/page-09.png'),
    (v_story_id, 10, 'Coloriage/Book_1/page-10.png')
  ON CONFLICT (story_id, page_number) DO UPDATE
    SET template_image_url = EXCLUDED.template_image_url;


  -- ── UPDATE MISSIONS ───────────────────────────────────────

  -- Step 1: Magic Stories — all 21 pages
  UPDATE missions
  SET page_start = 1, page_end = 21
  WHERE story_id = v_story_id AND day_number = 1;

  -- Step 2: Shiny Readers — PDF (upload to storyBook bucket as story.pdf, or use your existing path)
  UPDATE missions
  SET media_url  = 'storyBook/story-web.pdf',
      page_start = 1,
      page_end   = 21
  WHERE story_id = v_story_id AND day_number = 2;

  -- Step 3: Little Creators — all 21 coloring pages
  UPDATE missions
  SET page_start = 1, page_end = 21
  WHERE story_id = v_story_id AND day_number = 3;

  -- Step 4: Move & Groove — ← upload your video to storyBook bucket
  UPDATE missions
  SET media_url = 'storyBook/move-groove-web.mp4'
  WHERE story_id = v_story_id AND day_number = 4;

  -- Step 5: Sing Along — ← upload your song to storyBook bucket
  UPDATE missions
  SET media_url = 'storyBook/song.mp3'
  WHERE story_id = v_story_id AND day_number = 5;

  -- Step 6: Journey — ← upload your animated video to storyBook bucket
  UPDATE missions
  SET media_url = 'storyBook/journey-web.mp4'
  WHERE story_id = v_story_id AND day_number = 6;

END $$;


-- ── Verify ────────────────────────────────────────────────────
SELECT
  page_number,
  image_url,
  audio_url
FROM story_pages
WHERE story_id = (SELECT id FROM stories WHERE slug = 'the-talking-faces')
ORDER BY page_number;

SELECT day_number, type, title, media_url, page_start, page_end
FROM missions
WHERE story_id = (SELECT id FROM stories WHERE slug = 'the-talking-faces')
ORDER BY day_number;
