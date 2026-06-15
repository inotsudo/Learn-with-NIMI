# Phase BG — Curriculum Content Management System Verification Report

**Date:** 2026-06-14
**Scope:** Verification of the Phase BG implementation — see the
[architecture report](./phase-bg-cms-architecture.md) for the design.
Migrations 028, 029, and 030 were applied to the live Supabase project
via `supabase db push --linked` (all succeeded, "Finished supabase db
push.").

---

## 1. Automated test results

A new self-cleaning SQL suite was added at
[`supabase/tests/curriculum_cms_test.sql`](../supabase/tests/curriculum_cms_test.sql),
following the same `DO $$ ... ASSERT` pattern as
[`curriculum_progression_test.sql`](../supabase/tests/curriculum_progression_test.sql) /
[`achievement_certificate_system_test.sql`](../supabase/tests/achievement_certificate_system_test.sql).
It simulates an admin session (`set_config('request.jwt.claim.sub',
<admin id>, true)`) for the bulk-import scenarios and a parent session for
the regression scenario, using throwaway `discovery` missions
(sequences 9001-9004) and a throwaway test child under an existing
parent. Run with:

```
supabase db query --linked --file supabase/tests/curriculum_cms_test.sql
```

**Result: all 7 scenarios PASSED, zero residue.** Run twice (idempotent —
both runs PASSED).

| # | Scenario | Result |
|---|---|---|
| 1 | **Level CRUD** — insert 8 rows for a new level (`maxLevel+1`), edit the `morning` cell to point at level 2's mission, assert the change persisted and differs from the original, then delete all 8 rows and assert `count = 0` | **PASS** |
| 2 | **Bulk import — valid batch** — 2 new missions × 3 languages (6 rows) → `missions_created = 2`, `versions_created = 6`, `versions_updated = 0`; both new missions `active = false`; all 6 new versions `status = 'draft'` and `published = false` | **PASS** |
| 3 | **Bulk import — duplicate row in batch rejected** — same `(category_slug=discovery, sequence=9003, language=en)` twice → RPC raises an error containing "duplicate"; `count(missions where sequence=9003) = 0` (nothing persisted) | **PASS** |
| 4 | **Bulk import — unknown `category_slug` rejected** — `category_slug='no_such_category'` → RPC raises an error containing "category_slug"; `count(missions where sequence=9004) = 0` | **PASS** |
| 5 | **Re-import preserves status/published** — mark the 9001/en version `status='published'`, then re-import the same `(category_slug, sequence, language)` with edited title/subtitle → `versions_updated = 1`, `missions_created = versions_created = 0`; title updated to the new value, but `status` stays `'published'` and `published` stays `true` | **PASS** |
| 6 | **Content workflow transitions** — on the 9002/fr version (created as `draft`/`false` in scenario 2): `draft→review` ⇒ `published=false`; `review→published` ⇒ `published=true`; `published→archived` ⇒ `published=false` | **PASS** |
| 7 | **Regression spot-check** — fresh test child: `get_current_level = 1`; `get_curriculum_missions` returns 8 rows, 0 completed; `complete_curriculum_mission` on the level-1 "morning" mission returns `level=1` and bumps completed to 1; attempting a **level-3** mission still raises `'mission not in current level'` (migration 027's no-skip guard, unchanged) | **PASS** |
| — | **Cleanup** — both Scenario-2 missions (9001/9002, cascading to their `mission_versions`) deleted; final check: `count(missions where category_slug='discovery' and sequence in (9001,9002,9003,9004)) = 0` | **PASS** |

The `DO` block raised no exceptions in either run (an `ASSERT` failure
would raise `P0001` and abort the whole transaction, including cleanup) —
the zero-residue check confirms the full block, including cleanup, ran to
completion both times. A follow-up spot query also confirmed `max(level_number)
in level_missions` is back to `3` (Scenario 1's level 4 was fully removed)
and the test child (`__phase_bg_test_child__`) count is `0`.

---

## 2. TypeScript

`npx tsc --noEmit` — clean, zero errors, after all edits:
`app/admin/missionMeta.ts`, `app/admin/MissionEditor.tsx`,
`app/admin/MissionManager.tsx`, `app/admin/LanguagesManager.tsx`,
`app/admin/LevelEditor.tsx` (new), `app/admin/CategoriesOverview.tsx`
(new), `app/admin/BulkImportManager.tsx` (new),
`app/admin/CurriculumManager.tsx` (new), `app/admin/Sidebar.tsx`,
`app/admin/page.tsx`. Re-confirmed clean after removing the temporary
`/devpreview-curriculum` route used for browser verification (below).

---

## 3. Dev server / route checks

With the dev server running on port 3000 (confirmed via `ss -ltnp`):

| Route | Status |
|---|---|
| `/admin/login` | 200 |
| `/devpreview-curriculum` *(temporary, removed after verification)* | 200 |

---

## 4. Browser verification (Playwright)

A headless-Chromium pass over a temporary `/devpreview-curriculum` route
(rendering `CurriculumManager` standalone, the established Phase X/Y
devpreview pattern — created for this verification and **removed**
afterward) found **zero console/page errors** across all 4 tabs:

- **Levels** — renders the 3×8 grid matching the live `level_missions`
  (3 levels × `CATEGORY_ORDER`'s 8 categories), each cell showing its
  mission's sequence/title/status badge and a reassignment dropdown.
- **Categories** — renders the categories table (Category / Order /
  Default Type / # Missions / EN/FR/RW Published / Incomplete Sets) with
  the `default_type` editable dropdown.
- **Bulk Import** — renders the Download Template / Choose File controls
  and description text.
- **Quick Links** — renders one card per `CATEGORY_ORDER` category plus
  the "Languages & Translations" card.

`/admin/login` was also re-checked and still renders cleanly (200, zero
console errors).

### Bulk Import CSV upload/preview round-trip

A 3-row test CSV (2 valid rows forming one mission × 2 languages, 1 row
with an invalid `category_slug`) was uploaded via the hidden file input
on the Bulk Import tab — **preview only, nothing committed to the DB**:

| Row | Category | Seq | Type | Language | Title | Status |
|---|---|---|---|---|---|---|
| 1 | discovery | 9101 | read | en | Test Import Row | ✓ OK |
| 2 | discovery | 9101 | read | fr | Ligne de test | ✓ OK |
| 3 | bogus_category | 1 | sing | en | Bad Row | ⚠ unknown category_slug "bogus_category" |

Result: **"2 valid" / "1 with errors"** badges, **"Import 2 valid rows"**
button correctly enabled, zero console errors. This confirms
`BulkImportManager.tsx`'s client-side `XLSX.read()` → `sheet_to_json()` →
`validateRow()` → preview-table pipeline works end-to-end without
needing auth (no RPC call was made — the commit button was not clicked,
so the live DB was not touched by this check).

---

## 5. Interactive click-through (known limitation)

As with Phases BC/BD/BF, full interactive admin-session click-through
(logging in as an admin, clicking **Add Level** / **Delete Level** /
editing a cell's mission dropdown / committing a **Bulk Import** through
the authenticated UI) was not possible — no test admin credentials and no
Supabase service-role key are available in this environment (`.env.local`
only has `SUPABASE_ANON_KEY`/`SUPABASE_URL`).

This is covered by:

- **The SQL suite above**, which exercises every mutation path (Level CRUD
  insert/update/delete, the bulk-import RPC's validation and find-or-create
  logic, all 4 workflow-status transitions, and the duplicate/invalid
  rejection paths) directly against the live database — arguably a
  stronger guarantee than a UI click-through, since it tests the RPC and
  RLS policies an authenticated admin's clicks would ultimately invoke.
- **The zero-error Playwright pass** above, which proves all 4 Curriculum
  tabs render their full UI (grids, tables, dropdowns, upload controls)
  without hydration/runtime errors under unauthenticated RLS (empty-state
  data).
- **The live CSV upload/preview round-trip**, which proves the
  client-side parsing/validation/preview logic (the part of
  `BulkImportManager` that needs no auth) works correctly with a real
  file.

Flagged for a future session with test credentials to do a live
click-through of Add Level / Delete Level / cell reassignment / a
committed Bulk Import (followed by SQL cleanup of any rows it creates).

---

## 6. Regression safety

- `complete_curriculum_mission` (migration 027) was **not modified** —
  Scenario 7 above re-runs its exact behavior (level computation,
  completion bump, no-skip guard) and confirms it is unchanged after
  migrations 028-030 exist.
- `get_daily_missions`, `get_curriculum_missions`, `complete_mission`,
  `category_effective_language` were not modified; all continue to read
  `published`, which migration 028's trigger keeps in sync with the new
  `status` column for every existing row (backfilled) and every new row.
- All three new migrations are additive (new column + trigger + 2 new
  RLS policies + 1 new RPC) — no existing column, function signature, or
  policy was dropped or redefined except via `create or replace
  function`/`drop policy if exists ... create policy` on the *same* names
  with equivalent-or-broader semantics (standard admin-bypass pattern
  reused since migration 013).

---

## 7. Overall verdict

**Phase BG is complete.** The Curriculum CMS gives admins a single
"Curriculum" section to manage Levels (atomic 8-row level CRUD with a
visual grid), Categories (translation-coverage reporting +
`default_type`), a 4-state Draft/Review/Published/Archived content
workflow integrated into the existing Mission Manager/Editor/Languages
manager, and a CSV/XLSX bulk-import pipeline that creates new missions
inactive and new content as drafts. All 7 SQL scenarios pass with zero
residue, `tsc` is clean, and the new UI renders error-free in the browser
with a verified CSV preview round-trip. Interactive admin-session
click-through remains the same documented limitation as Phases BC/BD/BF,
mitigated by the SQL suite's direct exercise of every mutation path.
