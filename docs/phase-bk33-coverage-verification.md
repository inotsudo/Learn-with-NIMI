# BK.3.3 — Coverage Dashboard Verification

## TypeScript

`npx tsc --noEmit` — **PASS** (0 errors).

## Coverage computation spot-check

```sql
-- Languages with a non-empty is_current title per mission (mirrors hasLang)
SELECT
  lm.category_slug,
  SUM(CASE WHEN mv.language='en' AND trim(mv.title)<>'' THEN 1 ELSE 0 END) AS en,
  SUM(CASE WHEN mv.language='fr' AND trim(mv.title)<>'' THEN 1 ELSE 0 END) AS fr,
  SUM(CASE WHEN mv.language='rw' AND trim(mv.title)<>'' THEN 1 ELSE 0 END) AS rw
FROM level_missions lm
JOIN missions m ON m.id = lm.mission_id
LEFT JOIN mission_versions mv ON mv.mission_id = m.id AND mv.is_current = true
WHERE lm.level_number = 1 AND lm.unit_number = 1
GROUP BY lm.category_slug
ORDER BY lm.category_slug;
-- Returns 8 rows; values match what CoverageDashboard renders.
```

## pctBadgeClass boundaries

| pct | Expected class |
|-----|---------------|
| 100 | emerald (≥80%) |
| 80 | emerald |
| 67 | amber (≥50%) |
| 50 | amber |
| 33 | red (<50%) |
| 0 | red |

These thresholds match the three-tier `CoverageLevel` ('full'/'partial'/'single')
defined in `missionMeta.ts:COVERAGE_META`.

## Dev server smoke check

`/admin` → **200**. Coverage tab renders Level pills with percentage badges, Unit pills
with percentage badges, and the per-category language-badge table. Missing slots display
three ✗ badges and 0%.

## Playwright

No automated Playwright tests for admin CMS flows. Interactive click-through unverified.

## Constraints verified

- `translationCoverage()` from `missionMeta.ts` is the single coverage definition
  (no duplication between LessonManager and CoverageDashboard): ✓
- Coverage% rolls up correctly: lesson → unit (avg of 8) → level (avg of units): ✓
- No writes performed by this component: ✓
- No learner-facing tables touched: ✓
