# Phase BK — Curriculum V2 Capacity & Content Planning

**Date:** 2026-06-15
**Status:** Final pre-BK.2 planning artifact — **target scale confirmed by
user: 52 Units/Level**. No schema, RPC, or CMS changes in this phase — the BK
"freeze" (no new curriculum imports/missions/levels) remains in effect. This
doc does not change anything decided in
[phase-bk-curriculum-v2-architecture.md](phase-bk-curriculum-v2-architecture.md)
or
[phase-bk-curriculum-v2-migration-strategy.md](phase-bk-curriculum-v2-migration-strategy.md);
it stress-tests those designs against a concrete long-term size so BK.2's
schema/RPCs and BK.3's CMS are built for the real target, not just for
today's 24 rows.

---

## Why this doc exists

The architecture doc introduced `curriculum_levels.total_units` as "nullable,
admin-set, purely informational" — the column itself doesn't need a number to
be added safely. What **does** need a number:

- **BK.2's verification suite** — the existing plan tests "add a throwaway
  `unit_number=2` set" (2 units). A schema/RPC design that's only ever been
  run against 1–2 units could still hide O(n) query patterns that are fine at
  n=2 but not at n=52.
- **BK.3's CMS design** — whether "Units" is a flat grid or a paginated
  per-Level drill-down, and whether "Imports"/"Publishing" are row-listings or
  dashboards, depends entirely on whether we're designing for dozens or
  thousands of rows.
- **Content production planning** — translating thousands of lessons into
  `fr`/`rw` is a multi-year effort distinct from the engineering work; knowing
  the target size now lets that effort be scoped honestly.

---

## 0. Current-state baseline (live, 2026-06-15)

| Dimension | Value |
|---|---|
| Levels (`curriculum_levels`) | 3 (Toddler / Preschool / School Readiness) |
| Categories (`CATEGORY_ORDER`) | 8 |
| Languages | 3 (`en`/`fr`/`rw`) |
| Units per level (today, implicit) | 1 (per BK.2's `unit_number default 1`) |
| `level_missions` rows | 24 (3 levels × 1 unit × 8 categories) |
| `missions` rows | 10 (7 of 8 categories share 1 mission across all 3 levels — Phase BC placeholders; only "morning" has level-specific content) |
| `mission_versions` rows (target for 100% coverage) | 30 (10 missions × 3 languages) |
| Translation coverage | en 100% (10/10), fr 40% (4/10), rw 30% (3/10) |

Every projection below scales from this baseline using the formula
**`level_missions` rows = `missions` (lessons) = 8 categories × Units/Level ×
3 Levels** — i.e., the planning baseline assumes each `(level, unit,
category)` cell points at its **own distinct lesson** (no Phase-BC-style
sharing). Sharing remains technically possible and would *reduce* every
number below — it's a cost-reduction lever for BK.4 content production, not
a constraint on the schema.

---

## 1. Expected Units per Level

`total_units` is per-level and nullable, so different Levels *can* eventually
carry different targets (e.g., Toddler content may stay shorter than School
Readiness). For capacity planning we need one **representative scale** to
design and stress-test against.

| Scenario | Units/Level | Real-world framing |
|---|---|---|
| Pilot | 12 | ~1 quarter of weekly content |
| School-Year | 36 | ~9 months (a school year, weekly) |
| **Full-Year (recommended)** | **52** | **1 year, weekly — matches the "e.g., 52" example already used in the architecture doc** |
| Multi-Year | 104 | 2 years, weekly |

**Confirmed: plan against 52 Units/Level.** It's the figure already anchored
in the approved architecture doc, maps cleanly to "one new Unit unlocked per
week," and is large enough to force the CMS/performance decisions in §5–§7 to
be made correctly the first time (a design that only works at 12 would likely
need rework at 52; one built for 52 trivially covers 12 or 36).

---

## 2. Expected Lessons per Category per Level

At the 1-lesson-per-`(level, unit, category)` baseline, this is simply
**Units/Level**:

| Scenario | Lessons per category per level |
|---|---|
| Pilot (12) | 12 |
| School-Year (36) | 36 |
| **Full-Year (52)** | **52** |
| Multi-Year (104) | 104 |

**Today vs. target**: "Morning Song" already has 3 distinct lessons at Level
1 (Phase AA's rotation pool) vs. the 1-lesson-per-unit baseline above — a
**rotation pool** (N songs eligible per Unit, one picked per session) is an
optional *content-depth multiplier* on top of these numbers, not a
replacement for them. Not counted in the headline figures below; call it out
per-category during BK.4 content planning if/when adopted beyond "morning".

---

## 3. Estimated Lesson Count per Language

= 8 categories × Units/Level × 3 Levels = **24 × Units/Level**. This is also
the target `missions` row count, and the target `mission_versions` row count
*per language* for 100% translation coverage.

| Scenario | Lessons per language (= `level_missions`/`missions` rows) |
|---|---|
| Pilot (12) | 288 |
| School-Year (36) | 864 |
| **Full-Year (52)** | **1,248** |
| Multi-Year (104) | 2,496 |

(vs. today's 24 `level_missions` rows / 10 `missions` rows.)

---

## 4. Estimated Lesson Count Across All 3 Languages

= 3 × (§3) = **72 × Units/Level**. This is the target `mission_versions` row
count for 100% `en`/`fr`/`rw` coverage (before migration 037's revision
history multiplies it further — see §7).

| Scenario | Total `mission_versions` rows (target) |
|---|---|
| Pilot (12) | 864 |
| School-Year (36) | 2,592 |
| **Full-Year (52)** | **3,744** |
| Multi-Year (104) | 7,488 |

**Content-production framing**: at the recommended 52-unit scale, reaching
"every category in every language" means **3,744 translated lesson
versions** — roughly **125x** today's 30-row target. This is a multi-year
content effort independent of any engineering phase. Phase BK.1's
draft/review/published workflow and BK.3's "Publishing" hub (§5) are the only
practical way to track progress at this volume — there is no scale at which
"just look at the table" remains viable.

---

## 5. CMS Implications of the Chosen Scale

All figures below assume the recommended 52 Units/Level.

| Area | Today (3 levels × 1 unit) | At 52 Units/Level | Implication for BK.3 |
|---|---|---|---|
| **Units tab** (replaces LevelEditor's grid) | 3 rows × 8 cols = 24 cells, all visible at once | Per-Level: 52 rows × 8 cols = 416 cells; all 3 levels = 1,248 cells | Must be a **per-Level drill-down** (pick a Level, see its 52 Units) with a scrollable/virtualized unit list from day one — a flat 3×52×8 grid is unusable. Each cell's mission-picker (today a `<select>` of ~10 options, `LevelEditor.tsx:117-133`'s `optionsByCategory`) must become a **searchable combobox** once a category has 50+ candidate missions. |
| **Lessons tab** (`MissionManager`, per-category lists) | ~10 missions total, ~1-3 per category | ~156 missions/category (1,248 ÷ 8) | Needs search/filter/pagination per category. Round 5's global search (Navbar) already covers cross-entity search; per-category list views need the same treatment. |
| **Imports tab** (`BulkImportManager`) | 1 template = 26 rows (1 title + 1 header + 8 cats × 3 langs) | See §6 | Keep per-import-chunk size constant (§6) — do **not** scale the template row count with Units/Level. |
| **Publishing/Translation Coverage hub** (new, §5 of architecture doc) | `translationCoverage`/`COVERAGE_META` (`missionMeta.ts`) summarizes 30 target rows | Summarizes 3,744 target rows | Must be an **aggregated dashboard** (% published, grouped by level/unit/category/language) from day one — a row-per-`mission_version` listing of 3,744 rows is not a UI. |
| **Curriculum Safety** ("used in Level X, Unit Y", Step 7) | `select * from level_missions where mission_id = ...` against 24 rows | Same query against up to 1,248 rows | **No change needed** — `level_missions_mission_id_idx` (migration 026) makes this an indexed point-lookup regardless of table size. |
| **`curriculum_units` metadata table** (BK.2 §3.3, optional) | Not yet populated — "Unit 1" placeholder labels suffice for 1 unit/level | 52 unit titles/themes per level | Becomes genuinely useful at this scale ("Unit 7: Animals & Habitats 🐾" vs. "Unit 7") — worth populating as part of BK.4 content planning, not just leaving as `null`. |

---

## 6. Import Template Implications

**Recommendation: keep the import-template granularity at *per (Level,
Unit)* — i.e., today's existing 26-row shape (1 title row + 1 header row + 8
categories × 3 languages = 24 data rows), with one new optional `unit_number`
column** (architecture doc §3.5 already specifies this; defaults to `1`).

What this means concretely:

- A "Level 7 template" at 52 units/level is **not** one 1,250-row (8×3×52 + 2)
  file — it stays 26 rows, scoped to one `(level_number, unit_number)` pair.
  Admins download/fill/import **one Unit at a time**, exactly as the BK.1
  per-Level templates work today (just with `unit_number` now meaningful
  instead of implicitly `1`).
- **Optional convenience** for BK.3: a "Generate Unit Templates 1–52" bulk
  export — either a ZIP of 52 individual 26-row files, or a single workbook
  with 52 sheets (one tab per Unit, mirroring `BulkImportManager.tsx`'s
  existing `Level ${n}` sheet-naming, `:148`). Either way, **each importable
  chunk stays 26 rows** — the multiplication happens in file/sheet *count*,
  not row count per import.
- **`admin_bulk_import_missions` RPC**: confirm (during BK.2's
  implementation, not this doc) the function's row-by-row loop has no
  practical ceiling below ~24-48 rows (1-2 units) per call. If a ceiling
  exists, document it as a **CMS-level constraint** ("import one Unit — or
  two — at a time") rather than something that needs a schema change; the
  26-row-per-Unit convention above already keeps every realistic import well
  under such a ceiling.

---

## 7. Performance Implications

All figures assume the recommended 52 Units/Level (1,248 `level_missions` /
`missions` rows, 3,744 target `mission_versions` rows).

- **`level_missions`**: 24 → up to 1,248 rows. Trivial for Postgres. The new
  PK `(level_number, unit_number, category_slug)` means `get_current_position`
  and `get_curriculum_missions` (both filter on an exact `(level_number,
  unit_number)` pair) read **exactly 8 rows via index** per call — query cost
  is **independent of total table size**. No new indexes needed.

- **`missions` / `mission_versions`**: 10/~17 actual → up to 1,248/3,744
  *target* rows for 100% coverage. Migration 037's revision history
  (`revision_number`/`is_current`) multiplies `mission_versions` further over
  time — every edit adds a row, only `is_current=true` is "live". Even at a
  generous 3-5x average revision count, that's ~11,000-19,000 rows: still
  low-tens-of-thousands, well within normal Postgres table sizes (no
  partitioning/sharding needed). **Recommendation**: revisit a "prune old
  non-current revisions older than N days/edits" policy as a BK.3+
  nice-to-have once real content-editing volume is observed — not urgent at
  this scale.

- **`child_achievements`** — this is the one table whose growth depends on
  *learner count*, not just curriculum size. The new
  `unit-{level}-{unit}-complete-{lang}` badge (architecture doc §3.4) adds up
  to `52 units × 3 levels × 3 languages = 468` possible badge rows per fully
  progressed child (vs. 9 `level-{N}-complete-{lang}` rows today). For e.g.
  1,000 active learners, that's a ceiling around ~500K rows — meaningful, but
  **already well-indexed**: `unique (child_id, language, type, slug)`
  (migration 012) gives Postgres an index on exactly the 4 columns
  `get_current_position`'s sticky-filter `not exists (...)` check filters on
  — that lookup is an **index-only point check** today and remains so at this
  scale. No action needed beyond confirming this constraint survives BK.2
  unchanged (it does — BK.2 adds no columns to `child_achievements`).

- **CMS unscoped reads**: the migration-strategy doc's §3.3 "safe today, needs
  fixing before BK.4" checklist (`LevelEditor.tsx`, `MissionManager.tsx`
  badges, `AnalyticsManager.tsx`/`adminAnalytics.ts`,
  `getMaxCurriculumLevel`/`getLevelMissions`, `parentInsights.ts`) currently
  reads `level_missions`/`missions` with **no `unit_number` scoping** — at 24
  rows this is "a few extra rows fetched"; at 1,248 rows some of these
  (notably the LevelEditor-derived Units tab and per-mission "used in Level
  N" badges) would fetch **the entire curriculum** on every page load if left
  unscoped. **This capacity doc upgrades that checklist from "needs fixing
  before BK.4" to "must be fixed as part of BK.3"** — by the time Units 2+
  exist in any real volume, these reads must already be scoped by
  `(level_number, unit_number)`.

---

## Summary Table — All Dimensions at Each Scenario

| Scenario | Units/Level | Lessons/category/level (§2) | Lessons/language (§3) | Lessons across 3 langs (§4) |
|---|---|---|---|---|
| Pilot | 12 | 12 | 288 | 864 |
| School-Year | 36 | 36 | 864 | 2,592 |
| **Full-Year (recommended)** | **52** | **52** | **1,248** | **3,744** |
| Multi-Year | 104 | 104 | 2,496 | 7,488 |

---

## Confirmation Checklist (before BK.2 begins)

1. ✅ **Target scale — CONFIRMED 2026-06-15**: 52 Units/Level (full-year,
   weekly) is the figure BK.2's verification suite and BK.3's CMS will be
   designed/stress-tested against. (`total_units` itself stays
   nullable/per-level — this is a design target, not a hard schema limit.)
2. **Import granularity**: confirm per-(Level, Unit) = 26-row template chunks
   (§6) as the supported import shape, rather than per-Level-of-N-units
   monoliths.
3. **CMS scoping**: confirm BK.3's Units tab (per-Level drill-down +
   searchable picker) and Publishing hub (aggregated dashboard) are built
   this way from their first version, not retrofitted after a flat-grid v1.
4. **Checklist escalation**: confirm the migration-strategy §3.3
   "unit_number-unaware read sites" become **required** BK.3 work (not
   optional), per §7 above.

None of these block BK.2's schema migration itself (additive regardless of
scale) — they shape what BK.2's verification suite seeds and what BK.3 builds
next. With #1 confirmed, BK.2's verification suite (§5 of the migration
strategy) should add a "52-unit stress seed" scenario alongside its existing
2-unit functional scenario.

---

## Relation to Other BK Docs

- [phase-bk-curriculum-v2-architecture.md](phase-bk-curriculum-v2-architecture.md) — hierarchy/schema/RPC design (unaffected by this doc).
- [phase-bk-curriculum-v2-migration-strategy.md](phase-bk-curriculum-v2-migration-strategy.md) — §5 verification plan should add a "52-unit stress seed" scenario alongside the existing 2-unit functional scenario.
- [phase-bk-curriculum-v2-backward-compat.md](phase-bk-curriculum-v2-backward-compat.md) — no changes; this doc doesn't alter any RPC behavior, only the data volume it's exercised against.
