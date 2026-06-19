# BK.3.7 — Revision UI Verification

## TypeScript

`npx tsc --noEmit` — **PASS** (0 errors).

## Migration 037 verification (revision RPCs are live)

```sql
-- create_mission_version_revision exists
SELECT proname FROM pg_proc WHERE proname = 'create_mission_version_revision';
-- Returns: create_mission_version_revision

-- publish_mission_version_revision exists
SELECT proname FROM pg_proc WHERE proname = 'publish_mission_version_revision';
-- Returns: publish_mission_version_revision

-- Partial unique indexes active
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'mission_versions'
  AND indexname IN ('mission_versions_one_published_idx', 'mission_versions_one_current_idx');
-- Returns both index rows.
```

## revision_number population check

```sql
SELECT mission_id, language, revision_number, status, is_current, published
FROM mission_versions
ORDER BY mission_id, language, revision_number;
-- All existing versions have revision_number = 1.
-- This is expected — no revision has been created via the CMS yet.
-- When create_mission_version_revision fires, it inserts revision_number = 2
-- with is_current=true; the original row gets is_current=false.
```

## UI code review checklist

| Requirement | Status |
|---|---|
| `<details>/<summary>` wrapper removed | ✓ — section renders as a plain `<section>` |
| Section shown when `revisionsByLang[activeLang].length > 0` | ✓ |
| Version labels use `vN` not `Rev N` | ✓ |
| "Editing" badge shown for `is_current && !published` | ✓ |
| "Create Revision" button in section header | ✓ |
| Button disabled when `vf.status !== 'published'` | ✓ |
| Button tooltip shown on disabled state | ✓ — `title` prop set |
| Button enabled when `vf.status === 'published'` | ✓ |
| Rollback button on archived non-current revisions | ✓ (unchanged behavior) |

## Imports verified

```ts
import { GitBranch, History } from 'lucide-react'
// Both icons used in BK.3.7 additions; present in the import block.
```

## Dev server smoke check

`/admin` → **200**. MissionEditor opens a published mission → Revision History section
visible (not collapsed), "v1" label, 🟢 Live badge, "Create Revision" button enabled.
Open a draft mission → "Create Revision" button disabled with tooltip.

## Playwright

No automated Playwright tests for admin CMS. Interactive revision workflow (click
"Create Revision" → v2 Draft appears, "Editing" badge shows, rollback v1) unverified.
Code review and SQL verify the backend is correctly wired.

## Constraints verified

- No new `mission_versions` rows created during BK.3.7 (UI-only change): ✓
- `create_mission_version_revision` / `publish_mission_version_revision` RPCs untouched: ✓
- No learner-facing tables referenced or modified: ✓
- No curriculum content created (BK.4 freeze): ✓
