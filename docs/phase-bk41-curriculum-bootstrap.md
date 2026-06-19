# Phase BK.4B.1A — Curriculum Bootstrap

## Overview

Populated Level 1, Unit 1 ("Hello, World!") as the first production curriculum unit.
Migration 041 applied to live Supabase database on 2026-06-16.

**Migration:** `supabase/migrations/041_level1_unit1_bootstrap.sql`
**Push result:** `NOTICE: Level 1 Unit 1 bootstrapped successfully — 8 missions, 24 versions, 8 slots, 1 story, 5 pages, 15 page versions.`

---

## What Was Created

### Database records

| Table | Rows created | Details |
|---|---|---|
| `curriculum_units` | 1 | (level=1, unit=1, title="Hello, World!", emoji=👋) |
| `missions` | 8 | One per category slug |
| `mission_versions` | 24 | 8 missions × 3 languages (EN/FR/RW) |
| `level_missions` | 8 | All 8 category slots linked at level=1, unit=1 |
| `stories` | 1 | slug=`hello-friend-l1u1` |
| `story_pages` | 5 | Pages 1–5 (image_url null — BK.4C) |
| `story_page_versions` | 15 | 5 pages × 3 languages, text authored |

### Mission inventory

| # | Category | Title (EN) | Type | Status |
|---|---|---|---|---|
| 1 | `morning` | Hello, Hello! | `sing` | published |
| 2 | `movement` | Come to Me! | `move` | published |
| 3 | `artistic` | My Hello Hand | `color` | published |
| 4 | `histoire` | Baby Amara's Morning | `read` | published |
| 5 | `zoom` | Hello, Rwanda! | `watch` | published |
| 6 | `discovery` | Who Is That? | `watch` | published |
| 7 | `flipflop` | Hello, Friend! | `story` | published |
| 8 | `coloring` | My Smiley Face | `color` | published |

All 8 missions: `active = true`, `revision_number = 1`, `is_current = true`, `published = true`.

---

## Verification Queries

Run in Supabase dashboard SQL editor to confirm correct state.

### 1. Lesson Manager — 8 lessons visible for Level 1, Unit 1

```sql
SELECT lm.category_slug, m.type, m.active,
       mv_en.title AS title_en,
       mv_fr.title AS title_fr,
       mv_rw.title AS title_rw,
       mv_en.status AS status_en
FROM level_missions lm
JOIN missions m ON m.id = lm.mission_id
LEFT JOIN mission_versions mv_en ON mv_en.mission_id = m.id AND mv_en.language = 'en' AND mv_en.is_current
LEFT JOIN mission_versions mv_fr ON mv_fr.mission_id = m.id AND mv_fr.language = 'fr' AND mv_fr.is_current
LEFT JOIN mission_versions mv_rw ON mv_rw.mission_id = m.id AND mv_rw.language = 'rw' AND mv_rw.is_current
WHERE lm.level_number = 1 AND lm.unit_number = 1
ORDER BY lm.category_slug;
-- Expected: 8 rows, all status_en = 'published', all active = true
```

### 2. Unit Manager — Unit 1 visible

```sql
SELECT cu.level_number, cu.unit_number, cu.title, cu.theme_emoji,
       count(lm.category_slug) AS lesson_count
FROM curriculum_units cu
LEFT JOIN level_missions lm ON lm.level_number = cu.level_number AND lm.unit_number = cu.unit_number
WHERE cu.level_number = 1 AND cu.unit_number = 1
GROUP BY cu.level_number, cu.unit_number, cu.title, cu.theme_emoji;
-- Expected: 1 row, lesson_count = 8
```

### 3. Coverage — 100% (8/8 published in EN)

```sql
SELECT count(*) AS published_en_count
FROM level_missions lm
JOIN mission_versions mv
  ON mv.mission_id = lm.mission_id
 AND mv.language = 'en'
 AND mv.published = true
WHERE lm.level_number = 1 AND lm.unit_number = 1;
-- Expected: 8
```

### 4. Publishing — all 8 published across all 3 languages

```sql
SELECT language, count(*) AS published_count
FROM mission_versions mv
JOIN level_missions lm ON lm.mission_id = mv.mission_id
WHERE lm.level_number = 1 AND lm.unit_number = 1
  AND mv.published = true
GROUP BY language;
-- Expected: en=8, fr=8, rw=8
```

### 5. FlipFlop — story pages with per-language text

```sql
SELECT sp.page_number, spv.language, spv.text, spv.published
FROM stories s
JOIN story_pages sp ON sp.story_id = s.id
JOIN story_page_versions spv ON spv.story_page_id = sp.id
WHERE s.slug = 'hello-friend-l1u1'
ORDER BY sp.page_number, spv.language;
-- Expected: 15 rows (5 pages × 3 languages), all published = true
```

### 6. missions.active = true for all 8

```sql
SELECT m.category_slug, m.active, m.type
FROM missions m
JOIN level_missions lm ON lm.mission_id = m.id
WHERE lm.level_number = 1 AND lm.unit_number = 1;
-- Expected: 8 rows, all active = true
```

### 7. Progression — learner can complete Unit 1

```sql
-- Check that get_current_position returns (1, 1) for a new child
-- (Replace <child_uuid> with a real child id from your DB)
SELECT * FROM get_current_position('<child_uuid>', 'en');
-- Expected: level_number = 1, unit_number = 1
```

---

## Progression and Achievement Wiring

| Event | Trigger | Outcome |
|---|---|---|
| Child completes a lesson | `complete_curriculum_mission` RPC | `child_progress` row inserted; stars awarded |
| All 8 lessons in Unit 1 done | `get_current_position` advances | Position moves to (1, 2) |
| All units in Level 1 done | Level badge logic | `level-1-complete-{lang}` achievement |

The `level_slot_available` function (migration 019) gates each mission by language: a lesson
is only shown to a learner if a published version exists in their chosen language. All 3
languages are published for every lesson in Unit 1, so no language is gated.

---

## Known Gaps (BK.4C scope)

| Gap | Status |
|---|---|
| `story_pages.image_url` — all null | Illustrations not yet created |
| `story_page_versions.audio_url` — all null | Audio narration not yet recorded |
| `mission_versions.media_url` — all null | Video/audio assets not yet produced |
| Coloring template image | No coloring page template uploaded |

These gaps do not prevent the CMS or learner flow from functioning — text content and
instructions render without media. The app handles null media gracefully.

---

## Migration Design Notes

**Guard:** The DO block checks for an existing `(level=1, unit=1, category=morning)` row
in `level_missions` before running. Re-executing the migration is safe — it exits
with a NOTICE instead of creating duplicate data.

**Trigger reliance:** `trg_sync_mission_version_published` (migration 028) fires on every
`mission_versions` INSERT and sets `published = (status = 'published')`. The migration
does not set `published` explicitly — the trigger handles it.

**Sequence assignment:** Each mission gets `sequence = coalesce(max(sequence), 0) + 1`
within its category. This appends curriculum missions after any existing daily-adventure
missions in the same category without collision.

**FlipFlop `content_json`:** Set to `{}` (empty JSON object). The app reads story pages
from `story_page_versions` via `story_id` on the mission record; `content_json` is unused
for `type = 'story'` missions.
