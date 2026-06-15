# Phase BJ — Generalized Curriculum Framework Verification Report

**Date:** 2026-06-14

This report verifies the deliverables described in
[curriculum-framework.md](./curriculum-framework.md): migration 032
(`curriculum_levels`), the `LevelEditor.tsx` framework-metadata extension,
the `BulkImportManager.tsx` per-level template extension, and the framework
document itself.

---

## 1. Migration 032 applied

```
npx supabase db query --linked --file supabase/migrations/032_curriculum_levels.sql
```

Applied cleanly (empty result set, no error). Verified seed data:

```sql
select * from curriculum_levels order by level_number;
```

| level_number | age_range_label | framework_name | primary_focus |
|---|---|---|---|
| 1 | Ages 1–2 | Toddler Framework | Sensory & Motor Development |
| 2 | Ages 3–4 | Preschool Framework | Exploration & Social Development |
| 3 | Ages 5–6 | School Readiness / Pre-K Framework | Foundational Academics |

---

## 2. SQL test suite

`supabase/tests/curriculum_framework_test.sql` — self-contained, read-only
(no setup/cleanup needed), run via:

```
npx supabase db query --linked --file supabase/tests/curriculum_framework_test.sql
```

| # | Scenario | Result |
|---|---|---|
| 1 | `curriculum_levels` has exactly 3 fully-populated rows for levels 1-3 (non-empty `age_range_label`/`framework_name`/`primary_focus`) | PASS |
| 2 | RLS policies `"auth: read curriculum_levels"` (`auth.uid() is not null`) and `"admin: full access"` (`is_admin()` on both `using`/`with check`) exist | PASS |
| 3 | Every distinct `mission_id` in `missions` appears in `level_missions` at least once — **100% level-classified** (10/10 missions) | PASS |
| 4 | Every mission has at least one `en` `mission_versions` row — **100% language-classifiable baseline** (10/10 missions) | PASS |

Returned `"rows": []` with no error — **all 4 scenarios PASS**.

---

## 3. TypeScript

```
npx tsc --noEmit
```

Clean — no output, no errors across `supabase/migrations/032_curriculum_levels.sql`-dependent changes (`app/admin/LevelEditor.tsx`, `app/admin/BulkImportManager.tsx`).

---

## 4. Dev server / route check

```
curl -s -o /tmp/bj_admin_page.html -w "HTTP %{http_code}\n" http://localhost:3000/admin
```

→ `HTTP 200`, 19,127 bytes. The only `error`-matching strings are Next.js's
standard global-error-boundary scaffolding (`global-error.js`,
`next-error-h1`, `"errorStyles":"$undefined"`) present on every Next.js
page — no application-level error text, consistent with prior phases.

---

## 5. Browser verification — limitation

As with prior phases (BG/BH/BI), no Playwright/Chromium browser tool was
available. The new "Curriculum → Levels" framework-metadata row (3 inline
inputs per level: Framework Name / Age Range / Primary Focus, saved via
`curriculum_levels` upsert on blur) and the new "Download Level N Template"
buttons in "Curriculum → Bulk Import" could not be click-tested directly.
The SQL/`tsc`/route checks above substitute, consistent with the adjustment
used in Phases BH/BI.

---

## 6. Live data trace — Level-to-Category mapping & language coverage

A read-only trace (`/tmp/bj_trace_result.json`, plus a follow-up
`curriculum_levels`/journey check) confirmed the data behind
[curriculum-framework.md](./curriculum-framework.md) §4-5:

- **10 missions total**, all 10 appear in `level_missions` (24 rows = 3
  levels × 8 categories) — 100% level-classified, matching SQL Scenario 3.
- **"morning"** has 3 distinct missions (one per level — Phase AA's
  rotation); the other 7 categories reuse their Level-1 mission at Levels
  2/3 (Phase BC shared-placeholder design).
- Translation coverage: **EN 10/10 (100%)**, **FR 4/10 (40%)**, **RW 3/10
  (30%)** — matches the table in curriculum-framework.md §5 and Phase BI's
  Content Analytics trace.
- Learner "Ange" (live data, 2026-06-14): distinct missions completed per
  journey — `en: 10`, `fr: 5`, `rw: 6` — confirming the per-`(child_id,
  language)` journey model (Phase BD) is independent and live.

---

## Summary

| Check | Result |
|---|---|
| Migration 032 (`curriculum_levels`) applied + seeded | PASS |
| SQL test suite (`curriculum_framework_test.sql`, 4 scenarios) | PASS, zero residue (read-only) |
| `npx tsc --noEmit` | Clean |
| `/admin` route | HTTP 200, no application errors |
| Browser click-through (LevelEditor framework row / per-level templates) | Not available (no Playwright tool) — substituted with SQL/`tsc`/route checks |
| Live trace vs. real data (level-classification, translation coverage, Ange journeys) | All correct and internally consistent |

Phase BJ is verified and ready for the memory update.
