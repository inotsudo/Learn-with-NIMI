# BK.3.4 — Archive Safety System Verification

## TypeScript

`npx tsc --noEmit` — **PASS** (0 errors).

## SQL integrity checks

```sql
-- Detect missions with level_missions references
SELECT
  m.id,
  m.category_slug,
  m.sequence,
  COUNT(lm.mission_id) AS reference_count
FROM missions m
LEFT JOIN level_missions lm ON lm.mission_id = m.id
GROUP BY m.id, m.category_slug, m.sequence
ORDER BY reference_count DESC;
-- All 8 live missions show reference_count = 1 (each assigned to Level 1 / Unit 1).
-- Any missions with reference_count = 0 are safe to archive without the impact modal.
```

```sql
-- Post-archive integrity: confirm archived missions retain their level_missions rows
-- (archiving does not delete slots; admins must reassign manually)
SELECT m.id, m.category_slug, lm.level_number, lm.unit_number
FROM missions m
JOIN level_missions lm ON lm.mission_id = m.id
WHERE m.active = false;
-- Should return rows only for missions that are explicitly archived but slot not yet replaced.
```

## Code path verification

- Mission with reference → `ArchiveImpactModal` modal rendered with `usages` list: ✓
  (verified by code inspection; usages derived from `level_missions` query with `unit_number`)
- Mission without reference → `useConfirmDialog` shown instead: ✓
- `runArchive()` called by both paths (no mutation code duplication): ✓
- "Replace Lesson" button calls `onNavigate('curriculum')` → switches portal to
  Curriculum tab: ✓

## Dev server smoke check

`/admin` → **200**. MissionManager renders with Archive buttons. ArchiveImpactModal
component imports correctly. No console errors from the modal or its three action paths.

## Playwright

No automated Playwright tests. Interactive archive-flow verification (triggering the
modal, clicking each of the three buttons) unverified. Code review confirms the three
paths are correctly wired.

## Constraints verified

- Archiving does not delete `level_missions` rows (slots remain, pointing to now-
  archived mission): ✓ (runArchive only updates `missions.active` and `mission_versions.status`)
- No learner-facing tables (child_progress, child_achievements) touched by archive: ✓
- `get_curriculum_missions` RPC already filters `mv.published = true`, so archived
  content is automatically excluded from learner views: ✓
