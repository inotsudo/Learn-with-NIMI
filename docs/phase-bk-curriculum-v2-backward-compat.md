# Phase BK — Curriculum V2 Backward Compatibility Report

**Date:** 2026-06-15
**Status:** Design-time report for the proposed BK.2 migration
([phase-bk-curriculum-v2-migration-strategy.md](phase-bk-curriculum-v2-migration-strategy.md)).
No migration has been applied. This report is the "why it's safe to ship"
companion to that strategy and to
[phase-bk-curriculum-v2-architecture.md](phase-bk-curriculum-v2-architecture.md).

The user's constraints for Phase BK were: preserve learner progress,
achievements, certificates, and multilingual journey separation; no
destructive migration. Each is addressed below.

---

## 1. "Today = 3 Levels × 1 Unit each" — the core invariant

`level_missions` currently has exactly 24 rows: 3 `level_number` values ×
8 `category_slug` values, PK `(level_number, category_slug)`. BK.2 adds
`unit_number integer not null default 1`. Applying that default to all 24
existing rows produces:

| level_number | unit_number | category_slug (×8) |
|---|---|---|
| 1 | 1 | morning, movement, artistic, histoire, zoom, discovery, flipflop, coloring |
| 2 | 1 | (same 8) |
| 3 | 1 | (same 8) |

New PK `(level_number, unit_number, category_slug)` — these 24 rows satisfy
it trivially (it's a superset key of the old PK with a constant column).
**No row is added, removed, or re-pointed.** The dataset is now, by
definition, "3 Levels, each with exactly 1 Unit (Unit 1) of 8 categories" —
which is *exactly* what it was before, just expressed with one more
dimension.

---

## 2. RPC-by-RPC equivalence proof

For every RPC redefined in BK.2, "with all rows at `unit_number=1` and no
`level-{N}-complete-{lang}` badges *yet earned that would matter*" — see
§3 for the one case where sticky filtering changes the query shape but not
its *result* — the new definition returns the same output as migration 037.

### `get_current_position` ≡ `get_current_level` (037) + `unit_number=1`

037's `get_current_level` groups `level_missions` by `level_number` only and
picks the smallest level where `count(*) > count(cp.mission_id)`. BK.2's
`get_current_position` groups by `(level_number, unit_number)` — but since
every row has `unit_number=1`, each level has exactly one group, identical
to 037's single group per level. The `having`/`order by`/`limit 1` logic is
unchanged. **Same level is selected**; `unit_number` in the result is always
`1`.

The added sticky filter (`not exists (... slug = 'level-' || lm.level_number
|| '-complete-' || p_language)`) only *removes* level_numbers from
consideration that the child has already fully completed. 037's version
implicitly handled this too: a fully-completed level has `count(*) =
count(cp.mission_id)` (not `>`), so `having count(*) > count(cp.mission_id)`
already excluded it from being *selected* — the sticky filter doesn't change
which level is picked for an in-progress child. Its effect is only visible
in §3 (the "Units added later" case), which cannot occur until BK.4.

The saturation fallback (`max(level_number)` / `max(unit_number) within
it`) — with all `unit_number=1`, `max(unit_number) within max(level_number)`
is always `1`, matching 037's `(select max(level_number) from
level_missions)`.

**Conclusion**: `get_current_level` (the new 1-line wrapper) returns the
*same level_number* for every child/language as 037's full implementation,
for all data existing today.

### `get_curriculum_missions` ≡ 037's version + `unit_complete`/`level_complete`

BK.2 resolves `(v_level, v_unit) := get_current_position(...)`, where
`v_level` is proven identical to 037's `v_level` above and `v_unit ≡ 1`
always. The per-category join
`where lm.level_number = v_level and lm.unit_number = v_unit and
lm.category_slug = v_cat.slug` reduces to 037's `where lm.level_number =
v_level and lm.category_slug = v_cat.slug` (since `unit_number = 1` for
every row). Same 8 rows returned, same `id`/`title`/`media_url`/etc.

The two booleans:
- BK.2's `v_unit_total`/`v_unit_done` (scoped to `lm.unit_number = v_unit =
  1`) are numerically identical to 037's `v_total`/`v_done` (scoped to
  `lm.level_number = v_level`, which today *is* all of Unit 1) — so
  `unit_complete` carries the exact same true/false value as 037's
  `level_complete` did.
- BK.2's new `v_level_total`/`v_level_done` (scoped to `lm.level_number =
  v_level`, all units) are — with only Unit 1 existing — the *same* counts
  as `v_unit_total`/`v_unit_done`. So the new `level_complete` is also
  numerically identical to 037's `level_complete` today. (Its *meaning*
  diverges only once a Level has 2+ units — see §3.)

**Conclusion**: every existing consumer reading the renamed `unit_complete`
(in place of 037's `level_complete`) sees the identical value it saw before
the rename; the new `level_complete` is a same-valued bonus field until
Units 2+ exist.

### `complete_curriculum_mission` ≡ 037's version + `unit-{N}-1-complete-{lang}`

`(v_level_before, v_unit_before) := get_current_position(...)` ≡ 037's
`v_level_before` (proven above), `v_unit_before ≡ 1`.

The no-skip guard `where level_number = v_level_before and unit_number =
v_unit_before and mission_id = p_mission_id` reduces to 037's `where
level_number = v_level_before and mission_id = p_mission_id` (since
`unit_number = 1` for every row) — **identical accept/reject decisions**,
including for the shared-placeholder missions that appear in `level_missions`
at multiple `level_number`s (Phase BC design).

Category badge and program-certificate logic: byte-for-byte unchanged (not
touched by BK.2).

Unit-complete check (`v_unit_total`/`v_unit_done` scoped to
`(v_level_before, v_unit_before=1)`) is numerically identical to 037's
`v_level_total`/`v_level_done` (scoped to `v_level_before`, all of which is
Unit 1 today) — so:
- `unit-{v_level_before}-1-complete-{lang}` is awarded at **exactly the same
  moment** 037 would have awarded `level-{v_level_before}-complete-{lang}`.

Level-complete check (`v_level_total`/`v_level_done` scoped to
`v_level_before` across all units = just Unit 1 today) is the *same query*
037 ran — so `level-{v_level_before}-complete-{lang}` is **still awarded at
that same moment**, in addition to the new `unit-...-1-complete-...` badge.
`curriculum-complete-{lang}` follows the same `v_level_before >= v_max_level`
check, unchanged.

**Conclusion**: for any child completing missions today, BK.2 awards every
badge 037 would have awarded, at the same moments, **plus** one additional
`unit-{N}-1-complete-{lang}` badge alongside each `level-{N}-complete-{lang}`
— an *additive* achievement, never a substitute. No existing
`child_achievements` row's meaning changes; nothing is renamed or removed.

### `admin_bulk_import_missions` ≡ 037's version + optional `unit_number`

`v_unit_number := coalesce((v_row->>'unit_number')::integer, 1)` — any
existing CSV/XLSX (Phase BK.1 templates, which never set `unit_number`)
produces `v_unit_number = 1` for every row, and the upsert
`on conflict (level_number, unit_number, category_slug)` with
`unit_number=1` matches the same logical row 037's
`on conflict (level_number, category_slug)` would have matched (now found
via the 3-column PK instead of the former 2-column one). All validation,
mission find-or-create, and revision-safety logic is untouched.

---

## 3. The one behavior that *does* change — and why it's safe

The **only** scenario where BK.2 and 037 could disagree: a child has earned
`level-{N}-complete-{lang}` (moved on to Level N+1), and an admin later adds
`unit_number=2` rows to Level N (BK.4, currently frozen).

- **037's hypothetical behavior** (if it had a Unit concept at all — it
  doesn't): would recompute "Level N total" as 16 rows (2 units × 8), see
  the child has only 8 done, and consider Level N incomplete again —
  **demoting** the child back into Level N.
- **BK.2's actual behavior**: `get_current_position`'s sticky filter
  (`not exists (... slug = 'level-N-complete-{lang}')`) excludes
  `level_number = N` entirely from consideration for this child, *regardless*
  of how many units N now has. The child's position remains wherever it was
  (Level N+1 or beyond). **No demotion.**

This is the **only** intentional behavioral difference BK.2 introduces, and
it only manifests once BK.4 content exists — which is explicitly frozen
until BK.2 and BK.3 ship and this exact scenario is covered by the "sticky
scenario" test in the migration strategy's §5 verification plan.

For a child who has **not yet** earned `level-{N}-complete-{lang}` when Unit
2 is added: `get_current_position` recomputes Level N's total as 16 (now
visible, since no sticky badge exists yet) — they simply have more to do at
Level N before advancing, which is the *intended* "more content became
available" outcome, not a regression.

---

## 4. Achievements & certificates — slug inventory

| Slug pattern | BK.1 (today) | BK.2 |
|---|---|---|
| `{category}-master-{lang}` | exists | unchanged |
| `level-{N}-complete-{lang}` | exists | unchanged meaning; now also the sticky anchor for `get_current_position` |
| `program-complete-{lang}` | exists | unchanged |
| `curriculum-complete-{lang}` | exists | unchanged |
| `unit-{level}-{unit}-complete-{lang}` | — | **new**, additive; `unit-{N}-1-complete-{lang}` awarded alongside every existing `level-{N}-complete-{lang}` |

No row in `child_achievements` is ever updated or deleted by BK.2 — only
new rows (the new slug pattern) may be inserted, and only at moments that
already produce a `level-{N}-complete-{lang}` insert today.
`app/_achievementData.ts`'s existing 4-tier catalog (Phase BF) needs no
changes to keep working; BK.3 can add a 5th "Unit Badges" tier additively.

---

## 5. Multilingual journey separation — unaffected

Every BK.2 RPC takes `p_language` and reads/writes `child_progress` /
`child_achievements` filtered by `(child_id, language)`, exactly as 037 did.
`get_current_position(child, 'fr')` and `get_current_position(child, 'rw')`
are fully independent computations — switching a child's active language
(`updateChildLanguage`, Phase BD) does not interact with BK.2's new
`unit_number`/sticky logic in any language-crossing way. The existing
`multilingual_journey_separation_test.sql` suite is the regression check
(§5 of the migration strategy) that proves this remains true.

---

## 6. No destructive migration

Every BK.2 schema change is one of:
- `alter table ... add column ... default ...` (existing rows get a
  computed default, nothing removed)
- `alter table ... drop constraint` immediately followed by
  `... add primary key (...)` on a superset of the old key (no row violates
  it, proven in §1)
- `create table if not exists` / `create policy` (wholly new objects)
- `create or replace function` (037's bodies remain available via the
  migration-strategy's rollback notes — re-running 037 verbatim restores
  exact pre-BK.2 behavior)

No `drop table`, `delete`, `truncate`, or data-rewriting `update` appears
anywhere in the proposed migration.

---

## 7. Summary

BK.2, as designed, is a **pure superset** of migration 037's behavior for
all data that exists today: same levels selected, same missions returned,
same badges awarded at the same moments, plus one new additive badge per
level-completion event. The single behavioral difference (sticky
level-complete preventing demotion) is inert until BK.4 content exists, and
is itself the explicitly-requested fix for the demotion risk the user's spec
was designed to avoid. This justifies the BK.2 → BK.3 → BK.4 phasing in
[phase-bk-curriculum-v2-architecture.md](phase-bk-curriculum-v2-architecture.md#6-phasing):
BK.2 can ship and be verified against production data with zero observable
change to any learner, before any CMS or content work begins.
