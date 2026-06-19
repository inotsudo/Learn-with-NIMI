# Phase BK.3.8 — Curriculum Operations Hardening
## Architecture

**Date:** 2026-06-16
**Scope:** Admin CMS operational readiness for scaling to 1,248 lessons (3 levels × 52 units × 8 categories)
**Constraint:** No new curriculum content. Uses Level 1, Unit 1 (migration 041) as the production test fixture.

---

## 1. Goals

Validate that the Admin Curriculum CMS can safely manage real curriculum content at production scale:

| Goal | Verification approach |
|---|---|
| Draft → Published workflow correct | SQL test + Playwright |
| Archive atomically removes ALL revisions from learner view | SQL test + MissionManager fix |
| Restore gets content back to draft without auto-publishing | SQL test |
| Revision draft is isolated from live published content | SQL test + Playwright |
| Export → import round trip preserves published content | SQL test |
| Coverage dashboard accurately reflects translation state | SQL test + Playwright |
| Integrity audit detects orphans, gaps, inactive slots | SQL test |

---

## 2. Gap Analysis (pre-BK.3.8)

### Bug: Archive only archived `is_current=true` revisions

**File:** `app/admin/MissionManager.tsx:253–267` (`runArchive`)
**Impact:** High — learner-visible published content remained live after admin archived a mission

**Scenario that triggered the bug:**
When a mission had both a published revision (`is_current=false, status='published'`) and a newer draft revision (`is_current=true, status='draft'`), the archive operation only updated the `is_current=true` row. The published revision (`is_current=false`) was untouched, so learners continued to see the lesson.

**Fix:** Replace direct client-side update with `admin_archive_lesson` RPC (migration 042), which archives ALL rows for ALL languages regardless of `is_current`.

### Gap: No atomic archive/restore RPCs

The archive and restore operations were done as direct client-side Supabase calls. Atomic server-side RPCs are required for:
- Ensuring the `sync_mission_version_published` trigger fires for every row
- Preventing partial-archive states under concurrent edits
- Centralising permission checks at the RPC boundary

**Fix:** `admin_archive_lesson` and `admin_restore_lesson` RPCs (migration 042).

### Gap: No curriculum integrity report

No way to verify at scale that:
- Every active curriculum slot has a published mission in all 3 languages
- No stories are orphaned
- No level/unit/category slots are missing from `level_missions`

**Fix:** `get_curriculum_integrity_report` RPC (migration 042).

### Gap: No unit content export

No way to export a complete unit's published content for backup, review, or staging re-import.

**Fix:** `export_unit_content` RPC (migration 042) + Export Unit button in LessonManager.

### Gap: No Playwright test suite

No automated UI tests for the curriculum CMS workflows.

**Fix:** `playwright.config.ts` + `e2e/admin-curriculum-ops.spec.ts` (12 test cases).

---

## 3. Database Changes (Migration 042)

### `admin_archive_lesson(p_mission_id uuid) → jsonb`

```
Security: SECURITY DEFINER, admin-only
Returns:  { archived_version_count: N }
```

Archives ALL `mission_versions` rows for a mission (all languages, all revisions) and sets `missions.active = false`. The `sync_mission_version_published` trigger fires per row, setting `published = false` for each archived row. The partial unique index `mission_versions_one_published_idx` is never violated because all rows end up with `published = false`.

### `admin_restore_lesson(p_mission_id uuid) → jsonb`

```
Security: SECURITY DEFINER, admin-only
Returns:  { restored_version_count: N }
Raises:   exception if no archived is_current versions exist
```

Restores the `is_current = true` revision of each language from `'archived'` → `'draft'`. Old published revisions (if any, `is_current=false`) stay archived. `missions.active` remains `false` — the admin must explicitly publish after reviewing the restored draft.

**Intentional design:** Restore does not auto-publish. This forces content to go through the publish step again, ensuring it has not drifted from the approved state.

### `get_curriculum_integrity_report() → jsonb`

```
Security: SECURITY DEFINER, admin-only
Returns: {
  orphaned_stories:       [{id, slug, title}]
  inactive_slots:         [{level_number, unit_number, category_slug, mission_id}]
  missing_category_slots: [{level_number, unit_number, category_slug}]
  partial_translations:   [{level_number, unit_number, category_slug, published_languages, published_count}]
  generated_at:           timestamptz
}
```

- **orphaned_stories**: `stories` rows with no `missions.story_id` reference. Created by the StoryManager but never linked to a mission.
- **inactive_slots**: `level_missions` entries where the linked mission has `active = false`.
- **missing_category_slots**: For each known (level, unit) pair, identifies which of the 8 canonical category slugs has no `level_missions` entry.
- **partial_translations**: Active curriculum missions with fewer than 3 published language versions.

### `export_unit_content(p_level_number int, p_unit_number int) → jsonb`

```
Security: SECURITY DEFINER, admin-only
Returns: {
  level_number: int,
  unit_number:  int,
  rows:         [V2 import row, ...],  -- 24 rows for a fully-translated unit
  row_count:    int,
  exported_at:  timestamptz
}
```

Returns all published `mission_versions` for the unit. Each row has the V2 bulk import shape: `{level_number, unit_number, category_slug, language, title, content_json, status}`. Status is always `'draft'` in the export output — this ensures re-importing does not immediately publish the imported content, and triggers the revision-safety path in `admin_bulk_import_missions` (creates new draft revisions rather than overwriting live published content).

---

## 4. Component Changes

### `app/admin/MissionManager.tsx` — `runArchive` and `handleRestore`

| Method | Before | After |
|---|---|---|
| `runArchive` | Direct client update: `WHERE is_current = true` (bug: left published sibling live) | `supabase.rpc('admin_archive_lesson', { p_mission_id: m.id })` |
| `handleRestore` | Direct client update: `WHERE is_current = true AND status = 'archived'` | `supabase.rpc('admin_restore_lesson', { p_mission_id: m.id })` |

The ArchiveImpactModal flow is unchanged — the modal still shows level/unit usage before archiving, and calls `runArchive` if the user confirms.

### `app/admin/LessonManager.tsx` — Export Unit button

Added state: `exporting: boolean`, `exportError: string | null`
Added handler: `handleExportUnit(level, unit, unitTitle)` — calls `export_unit_content` RPC, passes rows to `exportXLSX` from `exportUtils.ts`.
Added UI: "Export Unit" button (with Download icon) in the unit header row, disabled while exporting.

---

## 5. Test Coverage

### SQL Tests: `supabase/tests/bk38_operations_hardening_test.sql`

| Scenario | Coverage |
|---|---|
| 1 | All 4 status transitions + trigger sync + non-admin RPC guard |
| 2 | `admin_archive_lesson` archives both revisions; `level_slot_available` returns false |
| 3 | `admin_restore_lesson` restores is_current to draft; non-current stays archived; active stays false; double-restore raises |
| 4 | Revision isolation: published sibling preserved during edit; publish replacement demotes old to archived; partial unique index integrity; creating revision from archived source raises |
| 5 | Export produces 24 rows matching V2 import schema; round-trip import creates 24 draft revisions without touching published originals |
| 6 | Coverage counts: single (1 published), partial (2 published), full (3 published) |
| 7 | Integrity report: orphaned story found; inactive slot found; 7 missing categories for throwaway unit |

All scenarios clean up after themselves. The test is safe to run against the live linked database.

### Playwright Tests: `e2e/admin-curriculum-ops.spec.ts`

| Test | UI path covered |
|---|---|
| 1.1 | Draft status badge visible in Mission Manager |
| 1.2 | Published content locked; Create Revision button visible |
| 1.3 | Published mission info banner present |
| 2.1 | ArchiveImpactModal appears for curriculum-linked missions |
| 2.2 | Archived mission shows Restore button |
| 3.1 | Create Revision produces draft; rollback available |
| 4.1 | Export Unit button visible in Lesson Manager |
| 4.2 | Export Unit triggers XLSX download with correct filename |
| 5.1 | Coverage Dashboard shows 8/8 Fully Translated for L1U1 |
| 5.2 | No Missing badges in L1U1 coverage view |
| 6.1 | Publishing Center shows 8 Published slots for L1U1 |
| 6.2 | Lesson Manager shows 8/8 and no Missing for L1U1 |

---

## 6. Key Constraints Not Changed

- The `trg_sync_mission_version_published` trigger (migration 028) remains the single source of truth for the `published` boolean — all RPCs rely on it.
- The partial unique indexes `mission_versions_one_published_idx` and `mission_versions_one_current_idx` (migration 037) remain. `admin_archive_lesson` does not violate them because archiving sets `published = false` (removing all rows from the partial index).
- The `level_slot_available` guard (migration 037) in `get_current_level` / `complete_curriculum_mission` means archived lessons drop out of progression automatically — no learner can get stuck on an archived lesson.
- `admin_restore_lesson` does not call `publish_mission_version_revision` — the admin must publish explicitly. This ensures restored content goes through human review before going live.

---

## 7. Deployment Order

1. Apply `supabase/migrations/042_curriculum_ops_hardening.sql`
2. Deploy app (picks up MissionManager RPC calls + LessonManager export button)
3. Run SQL test suite to verify RPCs
4. Run Playwright tests (requires `npm install -D @playwright/test && npx playwright install chromium`)
