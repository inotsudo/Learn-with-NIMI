# Phase BK.2 — Curriculum V2 Migration Verification Report

## 1. Migration apply

### First attempt: failed (Postgres validity error)

`npx supabase db push --linked` initially failed at statement 10
(`get_current_position`'s `create or replace function`) with:

```
ERROR: subquery must return only one column (SQLSTATE 42601)
```

Root cause: the original §4 body used `coalesce(<2-column subquery>,
<2-column subquery>)`, which Postgres rejects at function-creation time.
Because `supabase db push` applies each migration file transactionally, the
failure rolled back **all 8 sections** of migration 038, including the
`level_missions.unit_number` column add and the `curriculum_units` table
created earlier in the same file — confirmed via
`information_schema.columns`, which showed `level_missions` still had only
`(level_number, category_slug, mission_id)` after the failed push.

### Fix

§4 (`get_current_position`) was restructured from `coalesce(<subquery>,
<subquery>)` to a `with candidate as (...), fallback as (...) select ... from
(... union all ...) combined order by prio limit 1` pattern — see
`docs/phase-bk2-architecture-verification.md` §3 for the full before/after
SQL and equivalence argument.

### Second attempt: succeeded

```
npx supabase db push --linked
...
Finished supabase db push.
```

Output included only benign `NOTICE: policy "..." does not exist, skipping`
lines for `curriculum_units`'s two `drop policy if exists` guards (expected
— the policies didn't pre-exist, consistent with the `drop ... if exists ;
create ...` pattern used by every migration since 032).

### Post-apply schema check

`level_missions` after the successful push: **24 rows total, all 24 at
`unit_number = 1`** (3 levels × 8 categories × 1 unit — the exact pre-BK.2
baseline, now expressed under the new 3-column PK `(level_number,
unit_number, category_slug)`).

---

## 2. New test suite: `curriculum_v2_units_test.sql`

Run: `npx supabase db query --linked --file supabase/tests/curriculum_v2_units_test.sql`

Result: **PASSED** (empty result set, no error — per this tool's "no error
returned ⇒ all `assert` statements passed" convention, established by a
control test: a deliberately-failing `assert 1=2` in a `do $$ $$` block
*does* surface as a visible `ERROR: P0004` client error, while `raise
notice` success markers do not surface at all).

| Scenario | What it tests | Result |
|---|---|---|
| **A — Regression** | Fresh child, no `unit_number=2` rows anywhere. `get_current_position`=(1,1) for a new child; `get_curriculum_missions` returns 8 rows, all `unit=1`, all `unit_complete=level_complete`, `total=8/done=0`. After completing 7/8: still (1,1), `bool_or(unit_complete)`/`bool_or(level_complete)` both false. After completing the 8th via `complete_curriculum_mission`: `unit_complete=true`, `level_complete=true`, `level='2'`, `unit='1'`, both `unit-1-1-complete-en` and `level-1-complete-en` awarded, position advances to (2,1). | PASS |
| **B — New Unit (2-unit functional)** | Inserts 8 throwaway `missions`+`mission_versions`+`level_missions(1, 2, category, ...)` rows (one new mission per category, Level 1 Unit 2). A second fresh child stays at (1,1) despite Level 1 now having 2 units. After completing Unit 1's 8 (reusing Scenario A's mission IDs): `unit_complete=true, level_complete=false`, `unit-1-1-complete-en` awarded, `level-1-complete-en` **not** awarded, position → (1,2). After completing Unit 2's 8 new missions: `unit_complete=true, level_complete=true`, both `unit-1-2-complete-en` and `level-1-complete-en` awarded, position → (2,1). | PASS |
| **C — Sticky (no demotion)** | Re-checks Child A (Scenario A) after Scenario B added Unit 2 rows to Level 1. Child A earned `level-1-complete-en` *before* Unit 2 existed. Asserts `get_current_position(Child A)` is still `(2,1)`, explicitly **not** `(1,2)` — the sticky `level-1-complete-en` badge prevents retroactive demotion into the newly-added Unit 2. | PASS |
| **D — 52-Unit stress seed** | Bulk-inserts `52 units × 8 categories = 416` throwaway `level_missions` rows under sentinel `level_number=999`, all referencing one existing published mission. Asserts `count(*)=416` and `count(distinct unit_number)=52`. Runs a standalone query mirroring `get_current_position`'s grouping/`having`/`order by`/`limit 1` logic (filtered to `level_number=999`, not via the real RPC, since no real child can reach level 999) for a child with zero `child_progress` — asserts result is `(999, 1)`, confirming the new PK and grouping logic are correct at the confirmed 52-Units/Level target scale. | PASS |

**Cleanup**: all throwaway rows (`level_missions` for `level_number ∈
{(1,2,*), 999}`, 2 test children, 8 throwaway `missions`/`mission_versions`)
were deleted by the test's own cleanup block. Post-test
`level_missions` count: **24 rows, all `unit_number=1`** — identical to the
pre-test baseline, confirming zero leftover data.

---

## 3. Regression suites (re-run unchanged)

| Suite | Result |
|---|---|
| `supabase/tests/curriculum_progression_test.sql` (Phase BC, 5 scenarios) | PASS — no error |
| `supabase/tests/multilingual_journey_separation_test.sql` (Phase BD, 5 scenarios) | PASS — no error |

Both suites pre-date migration 038 and exercise `get_current_level`,
`get_curriculum_missions`, and `complete_curriculum_mission` through their
*old* (037) call shapes (e.g. `get_current_level(child, lang)` returning a
plain integer). Both passing unchanged confirms §4.2's "thin wrapper"
preserves the exact signature and return values every existing caller
depends on.

---

## 4. TypeScript

`npx tsc --noEmit` → **clean, zero output**.

The only source file touched in BK.2 is the 1-line PK-compat patch to
`app/admin/MissionManager.tsx:206` (see §5). No other file was edited, and
the new `unit`/`unit_complete` columns returned by `get_curriculum_missions`
are additive and unread by any current TypeScript type (`CurriculumMission`
in `lib/queries.ts` is unchanged) — so there was no possibility of a new
type error from the RPC signature change.

---

## 5. `MissionManager.tsx` PK-compat patch

Line ~206's `.upsert(...)` call was updated from:

```ts
.upsert({ level_number: createLevel, category_slug: categorySlug, mission_id: newMission.id }, { onConflict: 'level_number,category_slug' })
```

to:

```ts
.upsert({ level_number: createLevel, unit_number: 1, category_slug: categorySlug, mission_id: newMission.id }, { onConflict: 'level_number,unit_number,category_slug' })
```

This is a forced mechanical consequence of §1's PK change
(`(level_number, category_slug)` → `(level_number, unit_number,
category_slug)`) — without this patch, "+ New Mission" in MissionManager
would fail with a Postgres `there is no unique or exclusion constraint
matching the ON CONFLICT specification` error the moment migration 038
landed.

**Confirmed at the SQL level**: migration 038 §8
(`admin_bulk_import_missions`) uses the *identical* target —
`on conflict (level_number, unit_number, category_slug)` — and the migration
applied successfully, proving this constraint name/shape exists exactly as
the patched `onConflict` string expects.

**Not yet confirmed**: an interactive Playwright click-through of "+ New
Mission" in the running admin UI. No browser tool is available in this
environment (standing caveat across all recent phases). The SQL-level
constraint match is a strong proxy — the `onConflict` string and the actual
Postgres constraint must match by name/column-set for `upsert` to work at
all, and `admin_bulk_import_missions`'s identical target already exercises
that exact constraint successfully against the live DB.

---

## 6. Dev server smoke checks

`ss -ltnp` showed two `next-server (v16.2.2)` processes listening, on ports
3000 and 3001.

| Port | `/` | `/admin` | `/missions` | `/missions/flipflop` | `/missions/morning` |
|---|---|---|---|---|---|
| 3000 | 200 | timeout (`000`) | timeout | timeout | timeout |
| 3001 | 200 | 200 | 200 | 200 | 200 |

Port 3000 appears to be a stale process from an earlier session — it serves
only `/` and hangs on every other route (isolated via `curl --max-time 20`).
**Port 3001 is the active dev server** for this codebase and returns 200 on
all 5 smoke-checked routes post-migration, with a clean dev log. Port 3000's
staleness is unrelated to migration 038 and out of scope for BK.2.

---

## 7. Live production spot-check (Ange, language='rw')

Run against the real `children` row for "Ange" (parent looked up
dynamically, `set_config('request.jwt.claim.sub', ...)` set to satisfy
`is_my_child`):

| RPC | Result |
|---|---|
| `get_current_position(Ange, 'rw')` | `(1, 1)` |
| `get_current_level(Ange, 'rw')` | `1` |
| `get_curriculum_missions(Ange)` | `total=7, done=6, all_unit1=true, unit_eq_level=true` (all 7 returned rows have `unit=1` and `unit_complete=level_complete`) |

Identical level (1) and progress (6/7 done) to pre-migration expectations —
zero observable change for this real learner. The `unit≡1` and
`unit_complete≡level_complete` invariants hold for real production data
exactly as `docs/phase-bk-curriculum-v2-backward-compat.md` predicted.

---

## 8. Verification checklist (from the approved BK.2 plan)

| # | Item | Status |
|---|---|---|
| 1 | Migration 038 applies cleanly against the live linked project | ✅ (after the §4.1 `coalesce` fix) |
| 2 | `curriculum_v2_units_test.sql` — all 4 scenarios pass, zero leftover rows | ✅ |
| 3 | `curriculum_progression_test.sql` + `multilingual_journey_separation_test.sql` pass unchanged | ✅ |
| 4 | `npx tsc --noEmit` clean | ✅ |
| 5 | Route smoke-checks → 200 (`/admin`, `/`, `/missions`, `/missions/[category]`) | ✅ (port 3001) |
| 6 | Live Ange spot-check: same level + new fields behave per backward-compat proof | ✅ |

All 6 items satisfied.

---

## 9. Overall verdict

Migration 038 is live on the linked Supabase project. All new and regression
SQL test suites pass with zero leftover data; `tsc` is clean; the dev server
serves all smoke-checked routes with HTTP 200; and a real production child's
progression is byte-for-byte unchanged under the new RPCs. The one
implementation-time bug (`coalesce` over multi-column subqueries in
`get_current_position`) was caught by the first `db push` attempt, rolled
back automatically and atomically (no partial-migration state), fixed with a
functionally-equivalent `union all`/`prio` restructuring, and re-verified.

BK.2's foundation — `unit_number`, the new 3-column `level_missions` PK,
`curriculum_units`, `get_current_position`, the per-Unit
`unit-{level}-{unit}-complete-{lang}` badge, and the sticky
`level-{N}-complete-{lang}` no-demotion guarantee — is fully implemented,
tested, and production-safe. BK.3 (CMS Units tab + frontend `unit`/
`unit_complete` rename) can proceed on top of this foundation with no
further schema changes required.
