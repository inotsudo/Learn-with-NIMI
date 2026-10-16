-- ============================================================
--  NIMIPIKO — Deterministic Story-1 mission lookup (pre-045)
--
--  Problem
--  -------
--  Migration 045 wires Story 1 (the CK-era "Hello, Friend!" story) to six
--  BK-era missions and inserts story_slots, but it addresses those rows by
--  historical PRODUCTION UUIDs: story 8b47e35f-... and missions
--  53208e04 / a85643a1 / 1deb73c4 / 63475a84 / f8495c5e / c1265275.
--  Those UUIDs were produced by gen_random_uuid() when migration 041 ran
--  against the live CK database (041: INSERT ... RETURNING id, no
--  explicit id). On a fresh replay 041 generates DIFFERENT random UUIDs --
--  and in this replay environment 041 is itself skipped by its idempotency
--  guard because migrations 038/040 already populate level_missions -- so
--  the CK story hello-friend-l1u1 (and 8b47e35f) never exist on fresh
--  replay. Neither 0441 nor 0451 may hardcode that production capture.
--
--  Deterministic identifier
--  ------------------------
--  The CK-era story is identified by its slug 'hello-friend-l1u1'
--  (seed by 041, unique on stories.slug), not by a hardcoded UUID. Each
--  mission is identified by (category_slug, sequence), which migration
--  012 made UNIQUE (missions_category_slug_sequence_key) and which 041 is
--  the only migration to populate in these six categories between 012 and
--  045. That key is stable on every replay regardless of the random
--  mission UUIDs.
--
--  Mapping (category_slug, sequence) -> 045's intended slot
--    flipflop (story) -> flipflop_audio   (045 'flipflop_audio', 1)
--    histoire (read)  -> story_pdf        (045 'story_pdf', 2)
--    coloring (color) -> coloring         (045 'coloring', 3)
--    movement (move)  -> move_explore     (045 'move_explore', 4)
--    morning (sing)   -> sing_along       (045 'sing_along', 5)
--    zoom    (watch)  -> bonus_video      (045 'bonus_video', 6)
--
--  Fix
--  ---
--  Runs AFTER 044 (story_slots/missions exist) and BEFORE 045. Resolves
--  the CK story by slug, then re-points each of the six missions to it by
--  the deterministic (category_slug, sequence) key and materialises the
--  six story_slots rows 045 intended, using looked-up mission ids. Does
--  NOT seed duplicate mission rows and does NOT hardcode any production
--  UUID.
--
--  Guard: if the CK story is absent (e.g. 041 was skipped on a fresh
--  replay) there is nothing to wire pre-045, so this migration notices and
--  skips cleanly rather than raising. A missing mission (when the story
--  IS present) still raises a clear exception rather than silently wiring
--  the wrong row.
-- ============================================================

DO $$
DECLARE
  v_story   uuid;
  v_mission uuid;
  v_rec     record;
BEGIN
  -- Resolve the CK-era Story 1 by slug (never by a hardcoded production UUID).
  SELECT id INTO v_story
  FROM stories
  WHERE slug = 'hello-friend-l1u1'
  LIMIT 1;

  IF v_story IS NULL THEN
    RAISE NOTICE '0441: CK story hello-friend-l1u1 not present (041 may have been skipped on this replay); nothing to wire pre-045. Skipping.';
    RETURN;
  END IF;

  FOR v_rec IN
    SELECT * FROM (VALUES
      ('flipflop', 1, 'flipflop_audio', 1),
      ('histoire', 1, 'story_pdf',      2),
      ('coloring', 1, 'coloring',       3),
      ('movement', 1, 'move_explore',   4),
      ('morning',  1, 'sing_along',     5),
      ('zoom',     1, 'bonus_video',    6)
    ) AS t(cat, seq, slot_key, sort_order)
  LOOP
    SELECT id INTO v_mission
    FROM missions
    WHERE category_slug = v_rec.cat AND sequence = v_rec.seq;

    IF v_mission IS NULL THEN
      RAISE EXCEPTION '0441: no mission for (category_slug=%, sequence=%); expected exactly one from 041.',
        v_rec.cat, v_rec.seq;
    END IF;

    UPDATE missions SET story_id = v_story WHERE id = v_mission;

    INSERT INTO story_slots (story_id, slot_key, mission_id, sort_order)
    VALUES (v_story, v_rec.slot_key, v_mission, v_rec.sort_order)
    ON CONFLICT (story_id, slot_key) DO UPDATE
      SET mission_id = EXCLUDED.mission_id, sort_order = EXCLUDED.sort_order;
  END LOOP;

  RAISE NOTICE '0441: wired Story-1 missions to % by (category_slug, sequence).', v_story;
END $$;
