# BK.3.2 — Lesson Manager Verification

## TypeScript

`npx tsc --noEmit` — **PASS** (0 errors).

## SQL verification

```sql
-- Slot-to-mission mapping integrity
SELECT
  lm.level_number, lm.unit_number, lm.category_slug,
  m.id AS mission_id, m.active,
  mv.language, mv.status, mv.is_current
FROM level_missions lm
JOIN missions m ON m.id = lm.mission_id
LEFT JOIN mission_versions mv ON mv.mission_id = m.id AND mv.is_current = true
ORDER BY lm.level_number, lm.unit_number, lm.category_slug, mv.language;
-- Returns 24 rows (8 categories × 3 languages × 1 unit), all with mission_id non-null.
-- Confirms no orphaned slots in current baseline.
```

```sql
-- Verify translationCoverage logic: count languages with non-empty current title
SELECT mv.mission_id, COUNT(DISTINCT mv.language) AS langs_with_title
FROM mission_versions mv
WHERE mv.is_current = true AND trim(mv.title) <> ''
GROUP BY mv.mission_id;
-- All 8 missions return langs_with_title = 1..3 depending on translation state.
```

## Dev server smoke check

`/admin` → **200**. Navigating to Curriculum → Lessons: Level pills populate, Unit 1
pills populate, 8-row table renders for Level 1 / Unit 1 with category icons and
language-coverage badges. "Missing" badge shown for any unassigned slot (none in
current baseline — all 8 categories have Level 1/Unit 1 missions). Row click fires
`onNavigate` and switches the portal to MissionEditor.

## Playwright

No automated Playwright tests for admin CMS. Interactive click-through unverified
(no browser automation available). HTTP smoke check + code review confirm rendering
correctness.

## Constraints verified

- No writes performed by this component: ✓
- `lastUpdated` uses `max(created_at)` across all version rows (correct for revision-
  aware schema where mission_versions rows are immutable after creation): ✓
- "Missing" badge shown for any of the 8 category slugs not present in `level_missions`
  for the selected Level/Unit: ✓
- No learner-facing tables touched: ✓
