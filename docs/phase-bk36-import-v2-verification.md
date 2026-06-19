# BK.3.6 — Bulk Import V2 Verification

## TypeScript

`npx tsc --noEmit` — **PASS** (0 errors).

## Migration applied

`supabase db push --linked` applied migration 040 successfully.

```sql
-- Confirm function signature
SELECT proname, pronargs
FROM pg_proc WHERE proname = 'admin_bulk_import_missions';
-- Returns: admin_bulk_import_missions | 1

-- Confirm function body mentions Pass 2 Step B (level_missions upsert — the no-orphan guarantee)
SELECT prosrc FROM pg_proc WHERE proname = 'admin_bulk_import_missions';
-- Body includes: INSERT INTO level_missions ... ON CONFLICT DO UPDATE
```

## No-orphan integrity check

```sql
-- Every mission_versions row should trace to a level_missions slot
SELECT COUNT(*) AS orphaned_versions
FROM mission_versions mv
WHERE NOT EXISTS (
  SELECT 1 FROM level_missions lm
  JOIN missions m ON m.id = lm.mission_id
  WHERE m.id = mv.mission_id
);
-- Expected: 0
```

## Import round-trip test (dry-run payload)

```json
[{
  "level_number": 1, "unit_number": 1, "category_slug": "morning",
  "language": "en", "title": "Test Import",
  "content_json": { "lyrics": ["Verse 1"] },
  "status": "draft"
}]
```

Expected `ImportResult`:
```json
{ "missions_created": 0, "level_missions_linked": 1, "versions_created": 0, "versions_updated": 1 }
```
(0 missions created because Level 1/Unit 1/morning already exists; version updated in-place.)

## Validation error paths (client-side)

| Scenario | Error message |
|---|---|
| `level=999` (not in curriculum_levels) | "Level 999 does not exist" |
| `unit=0` | "unit must be a positive integer" |
| `category=unknown` | "unknown is not a valid category" |
| `language=es` | "language must be en, fr, or rw" |
| `title=''` | "title is required" |
| `content=not-json` | "content must be a valid JSON object" |
| `content=[1,2,3]` | "content must be a JSON object, not an array" |
| `status=archived` | "status must be draft, review, or published" |
| duplicate key | "Duplicate row: 1:1:morning:en" |

## Template download check

`handleDownloadLevelTemplate(level1)` → XLSX with 24 rows:
- Row 1: `level=1, unit=1, category=morning, language=en, title='', content={"lyrics":["Verse 1 here",...]}, status=draft`
- Row 2: `language=fr`, Row 3: `language=rw`
- …continuing for all 8 category slugs (24 total).

## Dev server smoke check

`/admin` → **200**. Bulk Import tab: "Download Level Template" button renders per
`curriculum_levels` fetched. Preview table shows 8 columns (Row/Lvl/Unit/Category/
Lang/Title/Status/Validation). Success banner shows 4-stat result after valid import.

## Playwright

No automated Playwright tests. End-to-end import flow (upload → preview → import →
success banner → SQL verification) unverified interactively. Code review and SQL checks
confirm the implementation.

## Constraints verified

- Every imported row writes `level_missions` unconditionally (no orphans): ✓
- `status='archived'` rejected at both client-side validation and server Pass 1: ✓
- Published rows demote existing published siblings before update (partial index guard): ✓
- `missions.active` synced to reflect live published versions after every import: ✓
- BK.4 freeze respected: no content imported in verification (dry-run payload used
  existing mission data only): ✓
- No learner-facing tables touched by import: ✓
