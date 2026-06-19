# Phase BK.2 — Curriculum V2 Architecture Verification Report

## 1. Scope

This report confirms that `supabase/migrations/038_curriculum_units.sql`
(applied live, see `docs/phase-bk2-migration-verification.md` for the apply
log and test results) implements §3 ("Schema Additions") and §4
("Progression Engine V2") of `docs/phase-bk-curriculum-v2-architecture.md`
**exactly as designed**, with one implementation-time bug fix (§3 below) and
one documented refinement of §4.3's framing (§4 below). It also re-affirms
`docs/phase-bk-curriculum-v2-backward-compat.md`'s equivalence proofs against
the *as-shipped* SQL — now empirically confirmed (not just argued) via the
new test suite and a live production spot-check.

---

## 2. §3 Schema Additions — confirmed as designed

| Architecture §3 item | Migration 038 section | Result |
|---|---|---|
| 3.1 `level_missions.unit_number integer not null default 1 check (unit_number > 0)`, PK → `(level_number, unit_number, category_slug)` | §1, lines 38-43 | Implemented verbatim. Applied live: all 24 pre-existing rows became `(level_number, 1, category_slug)`. |
| 3.2 `curriculum_levels.total_units integer`, nullable, informational | §2, line 49 | Implemented verbatim (`add column if not exists`). Not read by any RPC — confirmed by grep across §4-8: no function references `total_units`. |
| 3.3 `curriculum_units` table, RLS mirroring `curriculum_levels` (migration 032) | §3, lines 57-73 | Implemented verbatim: same `primary key (level_number, unit_number)`, same `auth: read` / `admin: full access` policy pair pattern. Zero rows seeded, as designed — CMS (BK.3) falls back to "Unit {unit_number}". |
| 3.4 New slug `unit-{level}-{unit}-complete-{lang}`, additive alongside `level-{N}-complete-{lang}` / `{category}-master-{lang}` / `program-complete-{lang}` / `curriculum-complete-{lang}` | §7, lines 425-433 | Implemented verbatim. No existing slug renamed or removed — confirmed: §7 still inserts `category || '-master-' || v_language`, `'program-complete-' || v_language`, `level-{N}-complete-{lang}`, `'curriculum-complete-' || v_language` unchanged from migration 037. |
| 3.5 `admin_bulk_import_missions` upsert target `on conflict (level_number, unit_number, category_slug)`, `unit_number` optional (defaults to 1) | §8, lines 595, 658, 668-670 | Implemented verbatim: `v_unit_number := coalesce((v_row->>'unit_number')::integer, 1)` in both validation and upsert passes, with a new `unit_number must be a positive integer` guard. Existing BK.1 templates (no `unit_number` column) produce `v_unit_number = 1` for every row, matching §1's "every existing row becomes `(level_number, 1, category_slug)`". |

All five items confirmed present, syntactically and semantically matching
the architecture doc, with no scope creep (no Admin UI / CMS / Analytics
changes beyond the single forced `MissionManager.tsx:206` PK-compat patch,
see `docs/phase-bk2-migration-verification.md` §5).

---

## 3. §4 Progression Engine V2 — confirmed as designed (with one fix)

### 4.1 `get_current_position` — implemented, with a Postgres-validity fix

The architecture doc's §4.1 SQL used:

```sql
select coalesce(
  ( select lm.level_number, lm.unit_number from ... limit 1 ),
  ( select lm2.level_number, max(lm2.unit_number) from ... group by lm2.level_number )
);
```

This is **not valid Postgres** — `coalesce()` requires scalar arguments, and
each subquery here returns two columns. The first `db push` attempt failed
at this exact statement with `ERROR: subquery must return only one column
(SQLSTATE 42601)`, and the entire migration (all 8 sections) was rolled back
atomically (confirmed via `information_schema.columns` showing
`level_missions` still lacked `unit_number` afterwards).

**As-shipped fix** (migration 038, §4, lines 85-122) restructures the same
"first candidate row, else fallback row" logic as a `with ... union all ...
order by prio limit 1`:

```sql
with candidate as (
  select lm.level_number, lm.unit_number, 0 as prio
  from level_missions lm
  left join child_progress cp on ...
  where level_slot_available(lm.mission_id, lm.category_slug, p_language)
    and not exists ( ... sticky filter on level-{N}-complete-{lang} ... )
  group by lm.level_number, lm.unit_number
  having count(*) > count(cp.mission_id)
  order by lm.level_number, lm.unit_number
  limit 1
),
fallback as (
  select lm2.level_number, max(lm2.unit_number) as unit_number, 1 as prio
  from level_missions lm2
  where lm2.level_number = (select max(level_number) from level_missions)
  group by lm2.level_number
)
select level_number, unit_number
from ( select * from candidate union all select * from fallback ) combined
order by prio
limit 1;
```

Every clause from the architecture doc's §4.1 is present and unchanged:
grouping by `(level_number, unit_number)`, the `level_slot_available` filter,
the sticky `not exists (... level-{N}-complete-{lang} ...)` filter, the
`having count(*) > count(cp.mission_id)` "smallest incomplete position"
selection, and the `(max level_number, max unit_number within it)`
saturation fallback. The `candidate`/`fallback`/`union all`/`prio` wrapper is
a **mechanical SQL-validity fix only** — `candidate` returns 0-or-1 rows
(prio 0), `fallback` always returns exactly 1 row (prio 1), and `order by
prio limit 1` reproduces `coalesce`'s "first non-null" semantics exactly.
This is the **only deviation from the architecture doc's literal SQL** in
the entire migration, and it is functionally equivalent — confirmed by
Scenario A/B/C of `curriculum_v2_units_test.sql` (see
`docs/phase-bk2-migration-verification.md`).

### 4.2 `get_current_level` — confirmed, verbatim

Migration 038 §5 (lines 130-136) is a byte-for-byte match of the
architecture doc's §4.2: a one-line `select level_number from
get_current_position(p_child_id, p_language)`, return type `integer`
unchanged from migration 037. Preserves the signature for every existing
caller (`app/_achievementData.ts`, `lib/parentInsights.ts`, parent dashboard
"Level N of 3").

### 4.3 `get_curriculum_missions` — confirmed, with a framing refinement

The architecture doc's §4.3 table describes the column change as
`unit_complete *(renamed from level_complete)*`, with `level_complete`
gaining a new meaning. **As shipped (migration 038 §6, lines 147-165), this
is implemented additively rather than as a rename**: the function returns
all of the original 14 columns (including `level_complete`, recomputed to
the new level-wide-across-all-units meaning) **plus two new trailing
columns, `unit integer` and `unit_complete boolean`**.

This is the resolution the BK.2 plan itself specified (its own §1.6 SQL is
additive, not a rename) and is **strictly more backward-compatible** than a
rename would have been:

- Existing frontend code reading `.level_complete` (the 5 call sites
  inventoried in §4.3: `app/page.tsx`, `app/missions/page.tsx`,
  `app/missions/[category]/page.tsx`,
  `components/missions/DailyAdventureBanner.tsx`, `lib/queries.ts`'s
  `CurriculumMission` type) continues to compile and run unchanged —
  `npx tsc --noEmit` is clean with zero edits to any of these files.
- While `unit_number ≡ 1` for every level (true for all data today),
  `level_complete` (new, level-wide meaning) and `unit_complete` (new,
  unit-wide meaning) are **numerically identical** — so existing readers of
  `.level_complete` see the exact same value they saw under migration 037,
  confirmed empirically by Scenario A of `curriculum_v2_units_test.sql`
  (`bool_and(unit_complete = level_complete)` over all 8 rows, both before
  and after the 8th-mission completion).
- The new `unit`/`unit_complete` fields are inert/unread until BK.3's
  planned frontend rename — no `tsc` impact, no behavior change.

This is a documented **refinement of §4.3's table framing**, not a deviation
from the BK.2 plan's own SQL or from the backward-compat doc's guarantees —
if anything it makes the BK.3 rename strictly additive/non-breaking when it
happens.

### 4.4 `complete_curriculum_mission` — confirmed as designed

Migration 038 §7 (lines 269-491) implements every element of architecture
§4.4:

- The 027/037 no-skip guard is preserved, now scoped to
  `(level_number = v_level_before and unit_number = v_unit_before and
  mission_id = p_mission_id)` (lines 321-326) — exactly "the mission must
  belong to the child's current (Level, Unit)".
- Category-badge (`{category}-master-{lang}`, lines 342-364) and
  program-certificate (`program-complete-{lang}`, lines 366-406) blocks are
  **byte-for-byte unchanged** from migration 037 (confirmed by direct
  comparison — same queries, same `category_effective_language` calls, same
  `on conflict (child_id, language, type, slug) do nothing` pattern).
- **New** unit-complete check (lines 408-433): counts
  `level_slot_available` rows for `(level_before, unit_before)` vs.
  `child_progress` rows for the same pair; on completion, inserts
  `unit-{level}-{unit}-complete-{lang}` and appends it to `new_badges`.
- **Reworked** level-complete check (lines 435-474): counts
  `level_slot_available` rows for `level_before` **across all
  `unit_number` values** vs. `child_progress` rows for the same level;
  on completion, inserts `level-{N}-complete-{lang}` (the sticky anchor
  §4.1 relies on) and, if `v_level_before >= v_max_level`, also inserts
  `curriculum-complete-{lang}` — both checks identical to 037's logic, just
  re-scoped from "the level's one set of 8 rows" to "all of the level's
  rows regardless of unit".
- Return jsonb (lines 479-487) adds `'unit', v_unit_after` alongside the
  existing `'level', v_level_after, 'level_complete', ..., 'unit_complete',
  ...` keys — matches §4.4's described shape.

The "fires once per `(child, language, level)`, never revoked" property of
`level-{N}-complete-{lang}` that makes it a valid sticky anchor is preserved
verbatim via the unchanged `on conflict (child_id, language, type, slug) do
nothing` insert pattern.

---

## 4. Backward-compatibility re-affirmation (as-shipped SQL)

`docs/phase-bk-curriculum-v2-backward-compat.md`'s central claim — "with
every `level_missions` row at `unit_number=1`, every redefined RPC returns
identical values to migration 037's" — was an argument made against the
*designed* SQL. It is now confirmed against the *as-shipped* SQL by two
independent checks:

1. **`curriculum_v2_units_test.sql` Scenario A** (fresh throwaway child, no
   `unit_number=2` rows anywhere): `get_current_position` returns `(1,1)`
   for a new child exactly as 037's `get_current_level` would return `1`;
   `get_curriculum_missions` returns 8 rows with `unit=1` and
   `unit_complete=level_complete` on every row, both before and after
   completing all 8; completing the 8th awards both
   `unit-1-1-complete-{lang}` and `level-1-complete-{lang}` in the same
   `complete_curriculum_mission` call, and `get_current_position` advances
   to `(2,1)` — identical to 037's "advance to level 2".

2. **Live Ange (language='rw') spot-check** (real production child,
   untouched by any test): `get_current_position` / `get_current_level` both
   return level 1, and `get_curriculum_missions` returns `total=7, done=6,
   all_unit1=true, unit_eq_level=true` — the `unit≡1` and
   `unit_complete≡level_complete` invariants hold for real data exactly as
   predicted.

Full results and exact figures are in
`docs/phase-bk2-migration-verification.md`.

---

## 5. Overall verdict

§3 (Schema Additions) and §4 (Progression Engine V2) of
`docs/phase-bk-curriculum-v2-architecture.md` are implemented in full by
migration 038, with:

- **One mechanical SQL-validity fix** to §4.1 (`coalesce` over
  multi-column subqueries → `candidate`/`fallback`/`union all`/`prio`),
  functionally equivalent and empirically verified.
- **One documented refinement** to §4.3's framing (additive `unit`/
  `unit_complete` columns instead of a `level_complete` rename), which is
  strictly more backward-compatible and matches the BK.2 plan's own SQL and
  the backward-compat doc's "Deferred to BK.3" framing.

No other deviations were found. Backward compatibility is confirmed both by
the new automated test suite and by a live production spot-check. BK.2's
foundation is ready for BK.3 (CMS Units tab + frontend `unit`/`unit_complete`
rename) and, eventually, BK.4 (Unit 2+ content).
