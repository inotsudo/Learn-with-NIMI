-- ============================================================
--  NIMIPIKO — Reconcile "the-talking-faces" slug ownership
--            (pre-045 reconciliation, forward-only)
--
--  Problem
--  -------
--  Migration 002 seeds a draft story with slug 'the-talking-faces'
--  (title 'The Talking Faces', random id). Migration 041 seeds the
--  CK-era story 8b47e35f-dcf8-4eb8-b130-c638ffd1acd0 with slug
--  'hello-friend-l1u1'. Migration 045 then promotes the CK-era story
--  to the canonical slug 'the-talking-faces':
--
--      update stories set ... slug = 'the-talking-faces' ...
--      where id = '8b47e35f-dcf8-4eb8-b130-c638ffd1acd0';
--
--  Because stories.slug is UNIQUE, this UPDATE aborts with
--  SQLSTATE 23514 (duplicate key on stories_slug_key) on any fresh
--  replay where the draft record from 002 still owns the slug.
--
--  Intended canonical identity (per 045's own intent + migration 156)
--  ------------------------------------------------------------------
--    Record A  8b47e35f-...   -> canonical slug 'the-talking-faces'
--              (CK-era story; 045 promotes it)
--    Record B  (draft, 002)   -> distinct slug 'nimi-and-the-talking-faces'
--              (156 first UPDATE does exactly this rename in production)
--
--  Fix
--  ---
--  Rename only the draft record (the one that owns the canonical slug
--  but is NOT the CK story) to its distinct slug, freeing the canonical
--  slug for 045 to assign. Neither story is deleted, merged, or
--  re-keyed: both keep their original UUIDs and all UUID-based
--  foreign keys / progress stay attached.
--
--  Placement: this file is named 0451_ so it sorts (byte-order, which
--  is how the Supabase CLI orders migrations) after 044_story_adventure
--  _rpcs.sql and before 045_seed_story_adventure_content.sql. It must
--  run before 045 so the canonical slug is free when 045 executes.
--
--  Idempotent / guarded: safe to re-run; refuses to overwrite an
--  existing 'nimi-and-the-talking-faces' record.
-- ============================================================

DO $$
DECLARE
  v_ck_story   uuid;   -- NULL when the CK story is absent (fresh replay: 041 skipped)
  v_target_slug CONSTANT text := 'nimi-and-the-talking-faces';
  v_draft_id uuid;
  v_target_owner_id uuid;
BEGIN
  -- Resolve the CK-era Story 1 by slug (never by a hardcoded production UUID).
  SELECT id INTO v_ck_story
  FROM stories
  WHERE slug = 'hello-friend-l1u1'
  LIMIT 1;

  -- Locate the record that currently owns the canonical slug but is NOT the CK story.
  -- If v_ck_story is NULL (041 skipped on fresh replay), do not exclude any id:
  -- rename whatever draft owns the canonical slug so 045 can claim it.
  SELECT id INTO v_draft_id
  FROM stories
  WHERE slug = 'the-talking-faces'
    AND (v_ck_story IS NULL OR id <> v_ck_story)
  LIMIT 1;

  IF v_draft_id IS NULL THEN
    -- Already reconciled (CK story owns the slug, or draft already renamed).
    RAISE NOTICE '0451: no draft record owns the-talking-faces; nothing to do (idempotent).';
    RETURN;
  END IF;

  -- Guard: refuse to clobber an unrelated record that already owns the target slug.
  SELECT id INTO v_target_owner_id
  FROM stories
  WHERE slug = v_target_slug
  LIMIT 1;

  IF v_target_owner_id IS NOT NULL AND v_target_owner_id <> v_draft_id THEN
    RAISE EXCEPTION
      'Migration 0451 blocked: slug % is already owned by an unrelated record (id %). Refusing to rename draft record %.',
      v_target_slug, v_target_owner_id, v_draft_id;
  END IF;

  -- Rename only the draft record to its distinct slug. UUID unchanged.
  UPDATE stories
  SET slug = v_target_slug
  WHERE id = v_draft_id;

  RAISE NOTICE '0451: renamed draft record % from the-talking-faces to %.',
    v_draft_id, v_target_slug;
END $$;
