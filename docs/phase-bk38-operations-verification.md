# Phase BK.3.8 — Curriculum Operations Hardening
## Verification Checklist

**Date:** 2026-06-16
**Fixture:** Level 1, Unit 1 — "Hello, World!" (migration 041, 62 rows)

---

## Pre-flight: Apply Migration 042

```bash
supabase db push --linked
# OR if pooler rejects (known issue from BK.3.1):
# Apply supabase/migrations/042_curriculum_ops_hardening.sql via Supabase dashboard SQL editor
```

**Expected output:**
```
Applied migrations: 042_curriculum_ops_hardening.sql
```

Verify the 4 new functions exist:
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('admin_archive_lesson','admin_restore_lesson',
                       'get_curriculum_integrity_report','export_unit_content');
-- Expected: 4 rows
```

---

## Task 1: Draft → Review → Published Workflow Validation

### 1a. SQL verification

```bash
supabase db query --linked --file supabase/tests/bk38_operations_hardening_test.sql
```

Expected output (Scenarios 1, 6):
```
NOTICE:  Scenario 1 PASSED: draft/review/published/archived trigger, non-admin RPC guard
...
NOTICE:  Scenario 6 PASSED: coverage counts verified — single(1), partial(2), full(3)
```

### 1b. Status transition quick-check SQL

```sql
-- All Level 1 Unit 1 versions should be status='published'
SELECT mv.status, count(*) FROM mission_versions mv
JOIN level_missions lm ON lm.mission_id = mv.mission_id
WHERE lm.level_number = 1 AND lm.unit_number = 1
  AND mv.published = true
GROUP BY mv.status;
-- Expected: published | 24
```

### 1c. Permissions check

```sql
-- Only admins can call the RPCs (non-admin session raises)
-- This is verified in Scenario 1 of the SQL test.
-- Confirm is_admin() function exists and returns false for non-admin JWT:
SELECT is_admin();  -- run as non-admin user → false
```

### 1d. Published content visibility rules

```sql
-- get_curriculum_missions returns only published versions
-- A new child at Level 1 should see 8 missions
-- (Replace with a real child_id from your DB)
SELECT count(*) FROM get_curriculum_missions('<child_uuid>');
-- Expected: 8
```

---

## Task 2: Archive Safety Validation

### 2a. SQL verification

Run the SQL test file (Scenarios 2 and 3):
```
NOTICE:  Scenario 2 PASSED: admin_archive_lesson archives all revisions, active=false, level_slot_available=false
NOTICE:  Scenario 3 PASSED: admin_restore_lesson restores is_current to draft, leaves others archived, active stays false
```

### 2b. Archive impact: learner cannot progress past archived slot

```sql
-- After archiving the morning mission for L1U1 (hypothetical),
-- level_slot_available should return false:
SELECT level_slot_available('<mission_uuid>', 'morning', 'en');
-- Expected: false
-- The level total drops from 8 to 7, so a child can still complete the level.
```

### 2c. Admin warnings (UI)

- [ ] Open MissionManager → Morning Song category
- [ ] Click three-dot menu on "Hello, Hello!" → Archive
- [ ] **Expected:** ArchiveImpactModal appears showing "Level 1 / Unit 1"
- [ ] **Expected:** Three buttons: Cancel, Replace Lesson, Archive Anyway
- [ ] Click Cancel → modal dismisses, mission unchanged

### 2d. Restore flow (UI)

- [ ] Toggle "Show archived" in MissionManager
- [ ] Find an archived mission → Restore button visible
- [ ] Click Restore → mission status returns to Draft
- [ ] Mission is NOT active after restore (must publish explicitly)

---

## Task 3: Revision Workflow Validation

### 3a. SQL verification

Run the SQL test file (Scenario 4):
```
NOTICE:  Scenario 4 PASSED: revision isolation, published sibling preserved during edit, publish replacement correct
```

### 3b. Manual steps (UI)

1. Open MissionManager → Morning Song → "Hello, Hello!" (EN, published)
2. Click **Create Revision to Edit**
3. **Expected:**
   - Status badge changes to `Draft`
   - Title input becomes editable
   - "Revision 2" indicator visible in revision history
   - English info banner: "Published Revision 1 is live for learners"
4. Edit the title (add "(test)")
5. Click **Publish**
6. **Expected:**
   - Status returns to `Published`
   - Revision 2 is now the published version
   - Revision 1 is demoted to `Archived` in revision history
7. **Rollback test:** Click Rollback on Revision 1
8. **Expected:** Revision 1 becomes published again; Revision 2 becomes archived
9. Verify only 1 published row per language via SQL:
   ```sql
   SELECT count(*) FROM mission_versions
   WHERE mission_id = '<morning-mission-uuid>' AND published = true;
   -- Expected: 3 (one per language)
   ```

### 3c. Partial unique index enforcement

```sql
-- Attempting to manually insert a second published version for the same
-- (mission_id, language) should fail:
INSERT INTO mission_versions (mission_id, language, title, content_json, status, revision_number, is_current)
VALUES ('<morning-uuid>', 'en', 'Conflict', '{}', 'published', 99, false);
-- Expected: ERROR duplicate key value violates unique constraint "mission_versions_one_published_idx"
```

---

## Task 4: Import/Export Round Trip

### 4a. SQL verification

Run the SQL test file (Scenario 5):
```
NOTICE:  Scenario 5 PASSED: export_unit_content returns 24 rows; round-trip import creates 24 draft revisions without touching published originals
```

### 4b. Export via UI

1. `/admin` → Lessons
2. Select Level 1 → Unit 1
3. Click **Export Unit**
4. **Expected:** Browser downloads `level1-unit1-hello-world.xlsx` (or similar)
5. Open the file — verify:
   - 24 rows
   - Columns: `level_number`, `unit_number`, `category_slug`, `language`, `title`, `content_json`, `status`
   - All rows have `status = draft`
   - 8 category slugs × 3 languages each

### 4c. Re-import verification

1. Open `/admin` → Import
2. Upload the downloaded XLSX
3. **Expected preview:** 24 rows, all valid, no errors
4. **Expected result banner after import:**
   ```
   Import complete — 0 new missions, 8 curriculum slots linked, 0 content versions created, 24 updated.
   ```
   **OR** (if published versions trigger revision creation):
   ```
   Import complete — 0 new missions, 8 curriculum slots linked, 24 content versions created, 0 updated.
   ```
   (The second form is correct if the export round-trip produces status='draft' and the current version is published → revision created)
5. Verify original published versions untouched:
   ```sql
   SELECT count(*) FROM mission_versions mv
   JOIN level_missions lm ON lm.mission_id = mv.mission_id
   WHERE lm.level_number = 1 AND lm.unit_number = 1 AND mv.published = true;
   -- Must remain: 24
   ```

---

## Task 5: Translation Coverage Validation

### 5a. SQL verification

Run the SQL test file (Scenarios 6 and 7):
```
NOTICE:  Scenario 6 PASSED: coverage counts verified — single(1), partial(2), full(3)
NOTICE:  Scenario 7 PASSED: integrity report finds orphan story, inactive slot, 7 missing categories for test unit
```

### 5b. Missing translation scenario (UI)

1. Open MissionManager → any category → create a new mission
2. Add only an EN version → do NOT add FR or RW
3. Navigate to Coverage Dashboard → Level 1 / Unit 1
4. **Expected:** The new mission row shows "Single Language" badge (gray)
5. Add FR title → badge should update to "Partial (2/3)" (amber)
6. Add RW title → badge should update to "Fully Translated" (green)

### 5c. Coverage Dashboard accuracy

```sql
-- Verify the dashboard's source data is consistent:
-- Every L1U1 slot should have 3 published versions
SELECT lm.category_slug,
       count(*) filter (where mv.published) as published_langs
FROM level_missions lm
JOIN mission_versions mv ON mv.mission_id = lm.mission_id
WHERE lm.level_number = 1 AND lm.unit_number = 1
GROUP BY lm.category_slug
ORDER BY lm.category_slug;
-- Expected: 8 rows, all published_langs = 3
```

---

## Task 6: Curriculum Integrity Audit

### 6a. SQL verification

```sql
SELECT get_curriculum_integrity_report();
```

**Expected output for a clean database (Level 1 Unit 1 only):**

```json
{
  "orphaned_stories": [],
  "inactive_slots": [],
  "missing_category_slots": [],
  "partial_translations": [],
  "generated_at": "..."
}
```

If the database is clean → all arrays empty → system is ready for BK.4B.2.

### 6b. Orphaned story check

```sql
-- No orphaned stories expected (hello-friend-l1u1 is linked to the flipflop mission)
SELECT count(*) FROM stories s
WHERE NOT EXISTS (SELECT 1 FROM missions m WHERE m.story_id = s.id);
-- Expected: 0
```

### 6c. No orphaned missions check

```sql
-- All Level 1 Unit 1 missions are in level_missions
SELECT count(*) FROM missions m
WHERE m.id NOT IN (SELECT mission_id FROM level_missions WHERE mission_id IS NOT NULL)
  AND m.active = true;
-- Expected: 0 (no active orphaned missions)
```

### 6d. Level/unit mapping verification

```sql
SELECT level_number, unit_number, count(*) AS slot_count
FROM level_missions
GROUP BY level_number, unit_number
ORDER BY level_number, unit_number;
-- Expected: level=1, unit=1, slot_count=8
```

---

## Summary Checklist

| Task | SQL | UI | Status |
|---|---|---|---|
| 1. Workflow transitions | Scenario 1, 6 pass | Tested manually | ⬜ |
| 2. Archive safety | Scenario 2, 3 pass | ArchiveImpactModal tested | ⬜ |
| 3. Revision isolation | Scenario 4 passes | Create/Rollback tested | ⬜ |
| 4. Export/import round trip | Scenario 5 passes | XLSX export tested | ⬜ |
| 5. Coverage accuracy | Scenarios 6, 7 pass | Dashboard verified | ⬜ |
| 6. Integrity audit | get_curriculum_integrity_report clean | — | ⬜ |
| tsc --noEmit | clean | — | ⬜ |
| Playwright | 12 tests pass | — | ⬜ |

**When all boxes are checked: BK.3.8 is complete → ready to begin BK.4B.2 (Level 1, Unit 2 content authoring).**

---

## Known Limitations (Scope for Future Phases)

| Limitation | Scope |
|---|---|
| Playwright tests skip gracefully when UI entry points are inaccessible (e.g. overflow menu not reachable) | BK.3.9 test stability pass |
| `get_curriculum_integrity_report` does not expose a UI surface — results are SQL-only | BK.3.9: admin integrity dashboard |
| Export XLSX only includes published versions — draft-only missions are excluded | By design; change in BK.4 if staging export is needed |
| Re-import of exported content creates new draft revisions — the admin must publish them individually | By design (revision safety); bulk-publish could be added in BK.3.9 |
