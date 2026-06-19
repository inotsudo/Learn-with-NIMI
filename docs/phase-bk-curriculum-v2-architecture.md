# Phase BK — Curriculum Architecture V2

**Date:** 2026-06-15
**Status:** Design document — no schema/RPC/CMS changes have been made yet.
Implementation is Phase BK.2 (schema + progression engine) and Phase BK.3
(CMS), each its own future plan-mode session. Phase BK.4 (real Unit 2+
content) remains **frozen** until BK.2 and BK.3 ship and are verified — see
[phase-bk-curriculum-v2-backward-compat.md](phase-bk-curriculum-v2-backward-compat.md)
for the freeze rationale.

This document is the architecture half of the Phase BK deliverables. The
companion [phase-bk-curriculum-v2-migration-strategy.md](phase-bk-curriculum-v2-migration-strategy.md)
covers the concrete SQL/ordering for BK.2; the companion
[phase-bk-curriculum-v2-backward-compat.md](phase-bk-curriculum-v2-backward-compat.md)
proves why none of this can regress a live learner.

---

## 1. Motivation

[curriculum-framework.md](curriculum-framework.md) (Phase BJ) describes
today's curriculum as **Framework → Level → Category → Lesson → Language
Version**, where a "Level" is a fixed bundle of exactly 8 missions (one per
category) and `curriculum_levels` currently has 3 rows (Toddler / Preschool
/ School Readiness). Levels 2 and 3 are mostly *shared placeholders*
pointing at Level 1's missions — the framework supports growth, but the
data model has no concept of "more than one set of 8 categories per Level".

The product goal is full-year programs: each Level should be able to hold
**up to 52 Units**, where a Unit is exactly today's "one set of 8
categories". This requires a new tier — **Unit** — sitting between Level and
Category:

```
Framework → Level → Unit → Category → Lesson → Language Version
   (label)  (curriculum_levels)  (NEW)  (categories)  (missions)  (mission_versions)
```

- **Unit Complete** = the 8 categories of that Unit are all done (today's
  entire "Level Complete" definition).
- **Level Complete** = *every* Unit currently defined for that Level is
  done.

---

## 2. Hierarchy ↔ Schema Mapping (confirmed)

| New term | Existing entity | Change in BK.2 |
|---|---|---|
| **Framework** | *(none)* — cosmetic label "NIMIPIKO Curriculum" | none — no table needed |
| **Level** | `curriculum_levels` row (`level_number` 1–3: Toddler/Preschool/School Readiness) | + optional `total_units integer` (nullable, admin-set target, e.g. 52) |
| **Unit** | *(new)* — today's "Level" content-grain (8 categories = 1 mission set) | new `level_missions.unit_number integer not null default 1` |
| **Category** | `categories` (8 fixed rows, `CATEGORY_ORDER`) | none |
| **Lesson** | `missions` | none — vocabulary rename only |
| **Language Version** | `mission_versions` (+ Phase BK.1 revisions: `revision_number`/`is_current`/`status`) | none |

Two design questions were resolved with the recommended option in each case:

1. **`curriculum_levels` = the new "Level" tier.** No new table sits above
   it; "Framework" is a single top-level label for the whole NIMIPIKO
   program. This was chosen over alternatives like "introduce a new
   `curriculum_frameworks` table and demote `curriculum_levels` to
   sub-rows" because NIMIPIKO only has one Framework today and the spec
   doesn't call for multiple simultaneous frameworks.
2. **Sticky level-complete** (see §4 and the backward-compat doc) governs
   how progression behaves once new Units are added to an
   already-completed Level.

### Why this mapping is minimally invasive

Every existing `level_number` already has exactly 8 `level_missions` rows —
**one Unit's worth**. Adding `unit_number` with `default 1` means **today's
data is already "3 Levels × 1 Unit each"**: no row changes meaning, no
migration of existing data, and (per §3) every progression RPC produces
identical results to today until an admin inserts `unit_number = 2` rows
somewhere.

---

## 3. Schema Additions (BK.2 scope)

All additive — see the migration strategy doc for exact SQL ordering and
the live-production caveats.

### 3.1 `level_missions.unit_number`

```sql
alter table level_missions
  add column unit_number integer not null default 1 check (unit_number > 0);

alter table level_missions drop constraint level_missions_pkey;
alter table level_missions
  add primary key (level_number, unit_number, category_slug);
```

Old PK was `(level_number, category_slug)`. Every existing row becomes
`(level_number, 1, category_slug)` — identical effective key. The 24
existing rows (3 levels × 8 categories) are unaffected.

### 3.2 `curriculum_levels.total_units`

```sql
alter table curriculum_levels add column if not exists total_units integer;
```

Nullable, admin-set, purely informational (drives CMS copy like "Level 1:
3 / 52 Units defined"). Not read by any progression RPC — `get_current_position`
(§4) derives "how many Units exist" directly from `level_missions`, so a
Level is never considered "complete" just because `total_units` says so.

### 3.3 `curriculum_units` (new, optional metadata table)

```sql
create table if not exists curriculum_units (
  level_number integer not null references curriculum_levels(level_number),
  unit_number  integer not null check (unit_number > 0),
  title        text,
  theme_emoji  text,
  primary key (level_number, unit_number)
);
```

For CMS labeling only (e.g. "Unit 3: Animals & Habitats 🐾"). RLS mirrors
`curriculum_levels` (migration 032): authenticated read, admin write. A
`(level_number, unit_number)` pair with no `curriculum_units` row is valid —
the CMS falls back to "Unit {unit_number}".

### 3.4 New achievement slug pattern

`unit-{level}-{unit}-complete-{lang}` — additive alongside the existing
`level-{N}-complete-{lang}` / `{category}-master-{lang}` /
`program-complete-{lang}` / `curriculum-complete-{lang}` (Phase BF 4-tier
catalog, `app/_achievementData.ts`). No existing slug is renamed or removed.

### 3.5 Bulk import linking key

`admin_bulk_import_missions`'s `level_missions` upsert target moves from
`on conflict (level_number, category_slug)` to
`on conflict (level_number, unit_number, category_slug)`. A new optional
`unit_number` row key defaults to `1` — existing CSV/XLSX templates (Phase
BK.1) remain valid unchanged.

---

## 4. Progression Engine V2

### 4.1 `get_current_position(p_child_id, p_language) → (level_number, unit_number)`

The new core RPC. Structurally the same query as today's
`get_current_level` (migration 026/037), but:

- **grouped by `(level_number, unit_number)`** instead of just
  `level_number` — "find the smallest incomplete (Level, Unit)".
- filters available rows the same way as today via
  `level_slot_available(mission_id, category_slug, language)` (Phase BK.1 /
  migration 037) — unchanged.
- **adds the sticky filter** (see §4.4): excludes every `level_number` for
  which `child_achievements` already has
  `type='badge', slug='level-{N}-complete-{lang}'`.
- falls back to `(max level_number, max unit_number within it)` once
  everything is done — same saturation pattern as today's
  `get_current_level`.

```sql
create or replace function get_current_position(p_child_id uuid, p_language text)
returns table(level_number integer, unit_number integer)
language sql stable as $$
  select coalesce(
    (
      select lm.level_number, lm.unit_number
      from level_missions lm
      left join child_progress cp
        on cp.mission_id = lm.mission_id
       and cp.language   = p_language
       and cp.child_id   = p_child_id
      where level_slot_available(lm.mission_id, lm.category_slug, p_language)
        and not exists (
          select 1 from child_achievements ca
          where ca.child_id = p_child_id
            and ca.language = p_language
            and ca.type = 'badge'
            and ca.slug = 'level-' || lm.level_number || '-complete-' || p_language
        )
      group by lm.level_number, lm.unit_number
      having count(*) > count(cp.mission_id)
      order by lm.level_number, lm.unit_number
      limit 1
    ),
    (
      select lm2.level_number, max(lm2.unit_number)
      from level_missions lm2
      where lm2.level_number = (select max(level_number) from level_missions)
      group by lm2.level_number
    )
  );
$$;
```

### 4.2 `get_current_level(p_child_id, p_language)` — thin wrapper

```sql
create or replace function get_current_level(p_child_id uuid, p_language text)
returns integer
language sql stable as $$
  select level_number from get_current_position(p_child_id, p_language);
$$;
```

Preserves the existing signature for every caller that only needs the Level
number (parent dashboard "Level 2 of 3", `app/_achievementData.ts`,
`lib/parentInsights.ts`).

### 4.3 `get_curriculum_missions(p_child_id)`

Redefined to resolve `(level_number, unit_number) := get_current_position(...)`
first, then join `level_missions` on **all three** key columns (today: just
`level_number`). Returns the same 8-row shape (one per category at the
child's current position), with one return-column change:

| Column | Today's meaning | V2 meaning |
|---|---|---|
| `unit_complete` *(renamed from `level_complete`)* | fires when all 8 categories of the (only) Unit at this Level are done | fires when all 8 categories of the **current Unit** are done — the frequent "Adventure complete" signal, every ~8 missions |
| `level_complete` *(new meaning)* | — | fires only when the Level's **last** Unit is done — the rare "Toddler Framework Mastered!" milestone |

**Frontend call sites requiring the coordinated rename** (inventoried, not
yet touched): `app/page.tsx`, `app/missions/page.tsx`,
`app/missions/[category]/page.tsx`,
`components/missions/DailyAdventureBanner.tsx`, and the `CurriculumMission`
type in `lib/queries.ts`.

### 4.4 `complete_curriculum_mission(p_child_id, p_mission_id)`

Same flow and no-skip guard as today (migration 027, preserved verbatim),
plus two new badge checks:

- **`unit-{level}-{unit}-complete-{lang}`** — awarded the first time every
  `level_slot_available` row for that exact `(level_number, unit_number)` is
  done. (Today, with 1 Unit per Level, this fires at the same moment as
  `level-{N}-complete-{lang}` — it's the generalization of today's
  per-Level badge to per-Unit.)
- **`level-{N}-complete-{lang}`** — awarded the first time every
  `level_slot_available` row for `level_number = N`, **across every
  `unit_number` that exists at that moment**, is done. This check only ever
  fires once per `(child, language, level)` — `child_achievements` is
  insert-once, never revoked — which is exactly what makes it the anchor for
  the sticky rule in §4.1.

`curriculum-complete-{lang}` / `program-complete-{lang}` keep their existing
semantics unchanged (`program-complete` already spans all levels/units via
the per-category `{category}-master-{lang}` badges, which are not grouped by
level/unit). Neither needs sticky-gating: they're permanent records once
earned, and if a brand-new max Level is added later, `get_current_position`
naturally routes a "finished everything" child into it (no
`level-{N}-complete` badge exists yet for that new Level, so it isn't
skipped).

---

## 5. CMS Restructuring (Phase BK.3 — after BK.2 ships)

New "Curriculum" sidebar nav, replacing today's 4-tab `CurriculumManager`:

| Tab | Source | Change |
|---|---|---|
| **Levels** | today's `LevelEditor` metadata editor | over `curriculum_levels`, gains `total_units` field |
| **Units** *(new)* | today's `LevelEditor` 8-category grid | becomes a per-Level grid: rows = Units (`unit_number`), columns = 8 categories, each cell a mission picker scoped to `(level_number, unit_number)`; "+ Add Unit" appends `unit_number = max+1` with 8 empty slots + a `curriculum_units` title/emoji field |
| **Lessons** | `MissionManager` (8 per-category lists) | unchanged |
| **Categories** | `CategoriesOverview` | unchanged |
| **Imports** | `BulkImportManager` | template gains optional `unit_number` column (default 1) |
| **Publishing** *(new)* | — | cross-cutting draft/review/non-current-revision queue (Phase BK.1 data) + curriculum-wide translation coverage view |

### 5.1 Curriculum Safety — "used in Level X, Unit Y" (Step 7)

Phase BK.1's `level_slot_available` already makes an archived-but-mapped
mission degrade *gracefully* (excluded from totals — this is what fixed the
fr/rw stuck-at-Level-1 bug). BK.3 adds the **visibility** layer: before
Archive in MissionManager/MissionEditor, query `level_missions` for rows
referencing this `mission_id`. If any exist, extend the existing
`useConfirmDialog()` (Round 20) with a 3-way prompt:

> "This lesson is used in Level {N} ({framework_name}), Unit {unit_number} —
> Replace with another lesson / Archive anyway / Cancel."

Purely additive UI; no new RPC (the dialog's "is this mission mapped"
query is a plain `select` against `level_missions`).

### 5.2 Translation Coverage / Publishing hub

Already substantially delivered by Phase BK.1 (`translationCoverage` /
`COVERAGE_META` in `app/admin/missionMeta.ts`). BK.3's "Publishing" tab
surfaces this curriculum-wide (across all Levels/Units/categories) rather
than per-mission. No further schema work identified beyond what BK.1 already
shipped.

---

## 6. Phasing

| Phase | Scope | Status |
|---|---|---|
| BK.1 | Mission revisions/publish/rollback/archive-deadlock guard (migration 037) | Done |
| **BK.2** | §3 schema + §4 progression RPCs + `unit_complete`/`level_complete` frontend rename | Next — own future plan-mode session |
| BK.3 | §5 CMS restructuring | After BK.2 ships & is verified |
| BK.4 | Real Unit 2+ content, any new Levels | **Frozen** until BK.2 + BK.3 are live |

See [phase-bk-curriculum-v2-migration-strategy.md](phase-bk-curriculum-v2-migration-strategy.md)
for BK.2's concrete migration plan and
[phase-bk-curriculum-v2-backward-compat.md](phase-bk-curriculum-v2-backward-compat.md)
for the no-regression proof that makes this phasing safe.
