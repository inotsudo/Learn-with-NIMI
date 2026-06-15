# Phase BK — Production Hardening & Launch Readiness — Verification Report

**Date:** 2026-06-14

This report ties together the five focus-area audits and verifies the
concrete changes made in this phase.

- [phase-bk-security-audit.md](./phase-bk-security-audit.md)
- [phase-bk-data-integrity-audit.md](./phase-bk-data-integrity-audit.md)
- [phase-bk-performance-baseline.md](./phase-bk-performance-baseline.md)
- [phase-bk-backup-recovery.md](./phase-bk-backup-recovery.md)
- [phase-bk-operational-readiness.md](./phase-bk-operational-readiness.md)

---

## 1. Dead/legacy code removed

13 files/directories deleted (12 from the approved plan + 1 discovered
during implementation, `app/api/manual-payment.ts` — same orphaned
Pages-Router pattern as the already-planned `app/api/missions.ts`):

```
app/api/mission_completions/
app/api/courses/            (incl. app/api/courses/missions/)
app/api/enrollments/
app/api/submissions/
app/api/student_reflections/
app/api/students/
app/api/Resources/
app/api/pikopals/
app/api/missions.ts
app/api/manual-payment.ts
app/api/stripe-session/
app/test/
app/test-student-form/
```

**Verification**: `grep -rl "api/<name>"` across `app/ lib/ hooks/
components/` for each removed route returned zero results before deletion
(except `app/test-student-form/page.tsx` → `/api/students`, which was
itself deleted in the same batch). After deletion, `npm run build` produced
32/32 routes successfully and `curl`-ing each deleted route returns `404`
(see §4).

## 2. Migration 033 — performance indexes

`supabase/migrations/033_performance_indexes.sql` — two `create index if
not exists` statements on `mission_versions(mission_id)` and
`story_page_versions(story_page_id)`. Applied via `npx supabase db query
--linked --file supabase/migrations/033_performance_indexes.sql` (empty
result, no error). Verified via `pg_indexes`:

```json
[
  {"indexname": "idx_mission_versions_mission_id", "tablename": "mission_versions"},
  {"indexname": "idx_story_page_versions_story_page_id", "tablename": "story_page_versions"}
]
```

## 3. New operational files

- `app/error.tsx`, `app/global-error.tsx` — branded error boundaries
- `.env.example` — 17 env vars, grouped, placeholders only
- `README.md` — setup/dev/build/deploy/migrations/backup-recovery summary

## 4. Build & smoke verification

```
$ npx tsc --noEmit
(clean, no output)

$ npm run build
✓ Compiled successfully in 8.5s
  Finished TypeScript in 17.3s
  Generating static pages using 11 workers (32/32) ...
```

(Required temporary placeholder `STRIPE_*` vars in local `.env.local` — see
[phase-bk-operational-readiness.md](./phase-bk-operational-readiness.md)
§2; not a regression from this phase's changes.)

`curl` smoke checks against a freshly-started dev server:

| Route | Expected | Got |
|---|---|---|
| `/` | 200 | 200 |
| `/admin` | 200 | 200 |
| `/missions` | 200 | 200 |
| `/api/missions` (deleted) | 404 | 404 |
| `/api/mission_completions` (deleted) | 404 | 404 |
| `/test` (deleted) | 404 | 404 |
| `/api/health` | 200 | **500** (pre-existing, see operational readiness §4) |

All results match expectations except `/api/health`, which was already
broken before this phase (missing `health_check` table) and is documented
as a recommended follow-up rather than fixed here (no new migration beyond
033 was in scope).

## 5. Findings discovered during this phase, not fixed (documented for follow-up)

| Finding | Where documented | Recommended fix |
|---|---|---|
| `/api/health` always 500 (missing `health_check` table) | operational-readiness §4 | New migration 034 creating `health_check` table + public-read RLS |
| `app/subscription/page.tsx` writes to nonexistent `manual_payments` table | data-integrity-audit §6 | New migration adding `manual_payments` table + RLS |
| `app/api/create-checkout-session` eager Stripe init breaks builds without `STRIPE_SECRET_KEY` | operational-readiness §2 | Move `new Stripe(...)` inside the request handler |
| `app/api/create-mobile-money-session` unused (0 frontend refs) | security-audit §6 | Product decision: wire up or remove |

None of these were part of the approved BK scope (12 deletions + migration
033 + error boundaries + `.env.example` + README + reports) — they were
surfaced by build/runtime verification while completing that scope, and are
recorded here so they aren't lost.

---

## Overall Summary

| Focus area | Result |
|---|---|
| Security audit | PASS — RLS/helpers/escalation-guards all sound; 13 dead/unauthenticated files removed |
| Data integrity audit | PASS — constraints/RPCs sound; 2 missing indexes added (migration 033) |
| Performance baseline | Recorded — 32 routes, 46 MB build, admin code-splitting confirmed |
| Backup & recovery | Documented — schema reproducible from migrations, data via Supabase PITR |
| Operational readiness | Error boundaries + `.env.example` + `README.md` added; 2 pre-existing broken endpoints documented |
| `tsc --noEmit` | Clean |
| `npm run build` | 32/32 routes succeed |
| Route smoke checks | 6/7 as expected, 1 pre-existing failure documented |

Phase BK is complete and ready for the memory update.
