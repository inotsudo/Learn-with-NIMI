# DOCUMENT 3: story-progression-spec.md

### Algorithm 1: `get_current_story(p_child_id, p_language)`

**Purpose:** Return the story_id of the story the child should see on their dashboard.

**Returns:** `uuid` (story_id)

```
FUNCTION get_current_story(p_child_id uuid, p_language text) RETURNS uuid

  -- 1. Get all published, non-retired stories ordered by sort_order
  candidate_stories = SELECT id, sort_order
    FROM stories
    WHERE status = 'published'
    ORDER BY sort_order ASC

  -- 2. Find the first story that is NOT complete for this child+language
  FOR story IN candidate_stories LOOP
    IF NOT is_story_complete(p_child_id, story.id, p_language) THEN
      RETURN story.id
    END IF
  END LOOP

  -- 3. All stories complete: return the last story (dashboard shows "all done!" state)
  RETURN candidate_stories[LAST].id

END FUNCTION
```

**Performance note:** This is O(N) where N = number of stories. With expected catalog size < 100 stories, this is fine. If it grows, add an index-backed optimization using a materialized `story_progress_summary` view.

---

### Algorithm 2: `is_story_unlocked(p_child_id, p_story_id, p_language)`

**Purpose:** Determine if a child can access a specific story.

**Returns:** `boolean`

```
FUNCTION is_story_unlocked(p_child_id uuid, p_story_id uuid, p_language text) RETURNS boolean

  -- 1. The story must be published
  story = SELECT id, sort_order, status FROM stories WHERE id = p_story_id
  IF story IS NULL OR story.status <> 'published' THEN
    RETURN false
  END IF

  -- 2. The first story (lowest sort_order) is always unlocked
  first_story_order = SELECT MIN(sort_order) FROM stories WHERE status = 'published'
  IF story.sort_order = first_story_order THEN
    RETURN true
  END IF

  -- 3. Find the immediately preceding published story (skip retired)
  prev_story = SELECT id FROM stories
    WHERE status = 'published'
      AND sort_order < story.sort_order
    ORDER BY sort_order DESC
    LIMIT 1

  IF prev_story IS NULL THEN
    -- No predecessor (this IS the first), unlock it
    RETURN true
  END IF

  -- 4. The story is unlocked if the previous story is complete
  RETURN is_story_complete(p_child_id, prev_story.id, p_language)

END FUNCTION
```

**Edge case -- retired stories:** If Story 3 is retired, the ordering becomes Story 1, Story 2, Story 4. Completing Story 2 unlocks Story 4 directly because the query filters `WHERE status = 'published'`.

---

### Algorithm 3: `complete_story_mission(p_child_id, p_mission_id, p_language)`

**Purpose:** Record completion of one slot mission within a story. Award stars, check for story completion, award badges/certificates.

**Returns:** `jsonb` with shape `{stars_earned, new_badges[], new_certificate, story_complete, next_story_unlocked}`

```
FUNCTION complete_story_mission(p_child_id uuid, p_mission_id uuid) RETURNS jsonb

  -- 0. Auth check
  IF NOT is_my_child(p_child_id) THEN
    RAISE EXCEPTION 'not authorized'
  END IF

  -- 1. Resolve child language
  v_language = SELECT language FROM children WHERE id = p_child_id
  v_language = COALESCE(v_language, 'en')

  -- 2. Validate mission exists and belongs to a story
  v_mission = SELECT id, story_id, stars, category_slug FROM missions WHERE id = p_mission_id
  IF v_mission IS NULL THEN
    RAISE EXCEPTION 'mission not found'
  END IF
  IF v_mission.story_id IS NULL THEN
    RAISE EXCEPTION 'mission not part of a story'
  END IF

  -- 3. Validate the mission belongs to a story_slot of a story the child has unlocked
  v_story_id = v_mission.story_id
  IF NOT is_story_unlocked(p_child_id, v_story_id, v_language) THEN
    RAISE EXCEPTION 'story not unlocked'
  END IF

  -- 4. Check if already completed (for idempotency)
  v_existed = EXISTS (
    SELECT 1 FROM child_progress
    WHERE child_id = p_child_id AND mission_id = p_mission_id AND language = v_language
  )

  -- 5. Upsert child_progress
  INSERT INTO child_progress (child_id, mission_id, language, stars_earned, completed_at)
  VALUES (p_child_id, p_mission_id, v_language, COALESCE(v_mission.stars, 10), now())
  ON CONFLICT (child_id, mission_id, language)
  DO UPDATE SET completed_at = now()

  IF v_existed THEN
    v_stars = 0  -- no new stars on replay
  ELSE
    v_stars = COALESCE(v_mission.stars, 10)
  END IF

  -- 6. Check story completion
  v_new_badges = []
  v_new_cert = NULL
  v_story_complete = is_story_complete(p_child_id, v_story_id, v_language)

  IF v_story_complete AND NOT v_existed THEN

    -- 6a. Award story-complete badge
    v_story_slug = SELECT slug FROM stories WHERE id = v_story_id
    v_badge_slug = 'story-' || v_story_slug || '-complete-' || v_language

    INSERT INTO child_achievements (child_id, language, type, slug)
    VALUES (p_child_id, v_language, 'badge', v_badge_slug)
    ON CONFLICT DO NOTHING

    IF ROW_COUNT > 0 THEN
      APPEND v_badge_slug TO v_new_badges
    END IF

    -- 6b. Award story certificate
    v_cert_slug = 'story-' || v_story_slug || '-certificate-' || v_language

    INSERT INTO child_achievements (child_id, language, type, slug)
    VALUES (p_child_id, v_language, 'certificate', v_cert_slug)
    ON CONFLICT DO NOTHING

    IF ROW_COUNT > 0 THEN
      v_new_cert = v_cert_slug
    END IF

    -- 6c. Check streak milestones
    v_completed_count = SELECT COUNT(DISTINCT s.id)
      FROM stories s
      JOIN story_slots ss ON ss.story_id = s.id
      WHERE s.status = 'published'
        AND NOT EXISTS (
          SELECT 1 FROM story_slots ss2
          WHERE ss2.story_id = s.id
            AND NOT EXISTS (
              SELECT 1 FROM child_progress cp
              WHERE cp.child_id = p_child_id
                AND cp.mission_id = ss2.mission_id
                AND cp.language = v_language
            )
        )

    FOR milestone IN [3, 5, 10, 20] LOOP
      IF v_completed_count >= milestone THEN
        v_streak_slug = 'story-streak-' || milestone || '-' || v_language

        INSERT INTO child_achievements (child_id, language, type, slug)
        VALUES (p_child_id, v_language, 'badge', v_streak_slug)
        ON CONFLICT DO NOTHING

        IF ROW_COUNT > 0 THEN
          APPEND v_streak_slug TO v_new_badges
        END IF
      END IF
    END LOOP

    -- 6d. Check all-stories-complete
    v_total_published = SELECT COUNT(*) FROM stories WHERE status = 'published'
    IF v_completed_count >= v_total_published THEN
      v_all_cert = 'all-stories-complete-' || v_language

      INSERT INTO child_achievements (child_id, language, type, slug)
      VALUES (p_child_id, v_language, 'certificate', v_all_cert)
      ON CONFLICT DO NOTHING

      IF ROW_COUNT > 0 THEN
        v_new_cert = v_all_cert  -- overrides story cert (both are stored, only latest returned)
      END IF
    END IF

    -- 6e. Check trilingual badge for this story
    v_trilingual = true
    FOR lang IN ['en', 'fr', 'rw'] LOOP
      IF NOT is_story_complete(p_child_id, v_story_id, lang) THEN
        v_trilingual = false
        EXIT
      END IF
    END LOOP

    IF v_trilingual THEN
      v_tri_slug = 'trilingual-story-' || v_story_slug

      INSERT INTO child_achievements (child_id, 'en', type, slug)
      VALUES (p_child_id, 'en', 'badge', v_tri_slug)
      ON CONFLICT DO NOTHING

      IF ROW_COUNT > 0 THEN
        APPEND v_tri_slug TO v_new_badges
      END IF
    END IF

  END IF

  -- 7. Check if next story was just unlocked
  v_next_story = SELECT id FROM stories
    WHERE status = 'published'
      AND sort_order > (SELECT sort_order FROM stories WHERE id = v_story_id)
    ORDER BY sort_order ASC
    LIMIT 1

  v_next_unlocked = (v_next_story IS NOT NULL AND v_story_complete)

  RETURN jsonb_build_object(
    'stars_earned',       v_stars,
    'new_badges',         to_jsonb(v_new_badges),
    'new_certificate',    v_new_cert,
    'story_complete',     v_story_complete,
    'next_story_unlocked', v_next_unlocked
  )

END FUNCTION
```

---

### Algorithm 4: `is_story_complete(p_child_id, p_story_id, p_language)`

**Purpose:** Check if all 6 required active mission slots are completed for this child+story+language.

**Returns:** `boolean`

```
FUNCTION is_story_complete(p_child_id uuid, p_story_id uuid, p_language text) RETURNS boolean

  -- Count total available slots (only slots whose mission is active and has
  -- a published version in the child's language or English fallback)
  v_total = SELECT COUNT(*)
    FROM story_slots ss
    JOIN missions m ON m.id = ss.mission_id AND m.active = true
    WHERE ss.story_id = p_story_id
      AND EXISTS (
        SELECT 1 FROM mission_versions mv
        WHERE mv.mission_id = m.id
          AND mv.language IN (p_language, 'en')
          AND mv.published = true
      )

  -- Count completed slots
  v_done = SELECT COUNT(*)
    FROM story_slots ss
    JOIN child_progress cp ON cp.mission_id = ss.mission_id
      AND cp.child_id = p_child_id
      AND cp.language = p_language
    WHERE ss.story_id = p_story_id

  RETURN (v_total > 0 AND v_done >= v_total)

END FUNCTION
```

**Design note:** An archived slot (mission.active = false) drops out of `v_total`, so archiving a single slot mission never permanently blocks story completion. This follows the `level_slot_available` pattern from migration 037.

---

### Algorithm 5: `get_story_progress(p_child_id, p_story_id, p_language)`

**Purpose:** Return detailed progress for a single story, used by the story detail screen.

**Returns:** Table of `(slot_key, mission_id, type, title, stars, completed, intro_consumed)`

```
FUNCTION get_story_progress(p_child_id uuid, p_story_id uuid) RETURNS TABLE

  -- 0. Auth + language resolution
  v_language = child's language

  -- 1. Return intro progress
  FOR slot_key IN ['intro_video', 'theme_song', 'story_intro'] LOOP
    v_consumed = EXISTS (
      SELECT 1 FROM story_intro_progress
      WHERE child_id = p_child_id AND story_id = p_story_id
        AND language = v_language AND slot_key = slot_key
    )

    RETURN ROW (
      slot_key      = slot_key,
      mission_id    = NULL,
      type          = 'intro',
      title         = NULL,  -- client resolves from story_versions
      stars         = 0,
      completed     = v_consumed,
      sort_order    = CASE slot_key
                        WHEN 'intro_video' THEN 0
                        WHEN 'theme_song' THEN 1
                        WHEN 'story_intro' THEN 2
                      END
    )
  END LOOP

  -- 2. Return mission slot progress
  v_lang = category_effective_language for each slot (or simpler: use v_language with 'en' fallback)

  FOR slot IN (SELECT ss.*, m.type, m.stars, mv.title
               FROM story_slots ss
               JOIN missions m ON m.id = ss.mission_id
               JOIN mission_versions mv ON mv.mission_id = m.id
                 AND mv.language = v_lang AND mv.published
               WHERE ss.story_id = p_story_id
               ORDER BY ss.sort_order) LOOP

    v_completed = EXISTS (
      SELECT 1 FROM child_progress
      WHERE child_id = p_child_id AND mission_id = slot.mission_id AND language = v_language
    )

    RETURN ROW (
      slot_key      = slot.slot_key,
      mission_id    = slot.mission_id,
      type          = slot.type,
      title         = slot.title,
      stars         = slot.stars,
      completed     = v_completed,
      sort_order    = slot.sort_order + 3  -- offset by intro count
    )
  END LOOP

END FUNCTION
```

---

### Algorithm 6: `complete_weekly_challenge(p_child_id, p_challenge_id)`

**Purpose:** Record completion of a weekly challenge. Award bonus stars.

**Returns:** `jsonb` with `{stars_earned, already_completed}`

```
FUNCTION complete_weekly_challenge(p_child_id uuid, p_challenge_id uuid) RETURNS jsonb

  -- 0. Auth check
  IF NOT is_my_child(p_child_id) THEN
    RAISE EXCEPTION 'not authorized'
  END IF

  v_language = child's language

  -- 1. Validate challenge exists
  v_challenge = SELECT id, story_id, stars FROM weekly_challenges WHERE id = p_challenge_id
  IF v_challenge IS NULL THEN
    RAISE EXCEPTION 'challenge not found'
  END IF

  -- 2. Validate story is complete (prerequisite)
  IF NOT is_story_complete(p_child_id, v_challenge.story_id, v_language) THEN
    RAISE EXCEPTION 'story not yet complete'
  END IF

  -- 3. Upsert progress
  v_existed = EXISTS (
    SELECT 1 FROM weekly_challenge_progress
    WHERE child_id = p_child_id AND challenge_id = p_challenge_id AND language = v_language
  )

  INSERT INTO weekly_challenge_progress (child_id, challenge_id, language, stars_earned, completed_at)
  VALUES (p_child_id, p_challenge_id, v_language, COALESCE(v_challenge.stars, 5), now())
  ON CONFLICT (child_id, challenge_id, language) DO NOTHING

  RETURN jsonb_build_object(
    'stars_earned', CASE WHEN v_existed THEN 0 ELSE COALESCE(v_challenge.stars, 5) END,
    'already_completed', v_existed
  )

END FUNCTION
```

---

### Achievement Trigger Summary

| Trigger Point | Achievement Slug | Type | Language Scope |
|--------------|-----------------|------|---------------|
| All 6 slots of Story X done in language L | `story-{story_slug}-complete-{L}` | badge | Per-language |
| All 6 slots of Story X done in language L | `story-{story_slug}-certificate-{L}` | certificate | Per-language |
| 3rd/5th/10th/20th story completed in language L | `story-streak-{N}-{L}` | badge | Per-language |
| All published stories completed in language L | `all-stories-complete-{L}` | certificate | Per-language |
| Story X completed in all 3 languages | `trilingual-story-{story_slug}` | badge | Cross-language (stored under `en`) |

**Award timing:** All achievements are checked and awarded atomically inside `complete_story_mission`. This follows the existing pattern from `complete_curriculum_mission` (migration 038).

**Idempotency:** All `INSERT INTO child_achievements` use `ON CONFLICT DO NOTHING`. Re-completing a mission never duplicates achievements.

---

### Admin RPC Summary

| RPC | Purpose | Returns |
|-----|---------|---------|
| `admin_validate_story_publishable(uuid)` | Run all 10 publish checks | `{publishable, errors[], warnings[]}` |
| `admin_publish_story(uuid)` | Set status=published, is_active=true, published_at=now() | `void` |
| `admin_retire_story(uuid)` | Set status=retired, is_active=false, retired_at=now() | `void` |
| `admin_reorder_stories(uuid[])` | Set sort_order = array position for each story | `void` |
| `get_story_integrity_report()` | Equivalent of `get_curriculum_integrity_report` for stories | `jsonb` with orphaned_missions, empty_slots, partial_translations |

---

### Critical Files for Implementation
- `/home/martin/Documents/Learn-with-NIMI/supabase/migrations/001_initial_schema.sql`
- `/home/martin/Documents/Learn-with-NIMI/supabase/migrations/012_daily_missions_v3.sql`
- `/home/martin/Documents/Learn-with-NIMI/supabase/migrations/038_curriculum_units.sql`
- `/home/martin/Documents/Learn-with-NIMI/supabase/migrations/037_mission_revisions_and_archive_fix.sql`
- `/home/martin/Documents/Learn-with-NIMI/lib/queries.ts`