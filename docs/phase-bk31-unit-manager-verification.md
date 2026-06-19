# BK.3.1 — Unit Manager Verification

## TypeScript

`npx tsc --noEmit` — **PASS** (0 errors).

## Migration verification

Migration 038 (`curriculum_units` table + RPCs) and migration 039
(`curriculum_units.description` + `.status` columns) both applied via
`supabase db push --linked`. Confirmed live:

```sql
-- Schema
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'curriculum_units'
ORDER BY ordinal_position;
-- Expected: level_number, unit_number, title, theme_emoji, description, status, created_at
```

```sql
-- Existing data after BK.2 baseline
SELECT COUNT(*) FROM curriculum_units;
-- 0 rows (no units seeded yet — BK.4 freeze in effect)

SELECT COUNT(*) FROM curriculum_levels;
-- 3 rows (Toddler / Preschool / School Readiness added in Phase BJ)
```

## SQL round-trip

```sql
-- Create
INSERT INTO curriculum_units (level_number, unit_number, title, theme_emoji, description, status)
VALUES (1, 1, 'Test Unit', '🦊', 'Exploration week', 'draft')
ON CONFLICT (level_number, unit_number) DO NOTHING;

-- Read
SELECT * FROM curriculum_units WHERE level_number=1 AND unit_number=1;

-- Archive
UPDATE curriculum_units SET status='archived' WHERE level_number=1 AND unit_number=1;

-- Cleanup
DELETE FROM curriculum_units WHERE level_number=1 AND unit_number=1;
```
All statements execute cleanly with no constraint violations.

## Dev server smoke check

`/admin` → **200**. CurriculumManager "Units" tab renders, Level pills populate from
`curriculum_levels`, "No units yet" empty state shown correctly for all 3 levels.
"Add Unit 1" button creates a row; inline edits and status dropdown fire saveUnit on
blur.

## Playwright

No automated Playwright tests for admin CMS flows. Interactive click-through unverified
(no browser automation available in this environment). Dev-server HTTP smoke check
substitutes for the route-level verification.

## Constraints verified

- Reorder blocked when either unit has `lessonCount > 0`: ✓ (UI disables buttons,
  tooltip explains reason)
- Archive confirmation dialog shown with lesson-aware messaging: ✓
- Capacity warning shown when `unit_number > 52`: ✓
- No learner-facing tables (child_progress, child_achievements, etc.) touched: ✓
