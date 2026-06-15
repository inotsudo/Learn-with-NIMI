# Phase BF — Achievement & Certificate System Verification Report

**Date:** 2026-06-14
**Scope:** Verification of the Phase BF implementation — see the
[architecture report](./phase-bf-achievement-architecture.md) for the
audit and design. No migration was applied (none required).

---

## 1. Automated test results

A new self-cleaning SQL test suite was added at
[`supabase/tests/achievement_certificate_system_test.sql`](../supabase/tests/achievement_certificate_system_test.sql),
following the same `DO $$ ... ASSERT` pattern as
[`curriculum_progression_test.sql`](../supabase/tests/curriculum_progression_test.sql) /
[`multilingual_journey_separation_test.sql`](../supabase/tests/multilingual_journey_separation_test.sql).
It creates one throwaway test child under an existing parent
(`f4418058-9f83-4f3c-b74c-fbaed84cc059`), drives it through full
curriculum completions (10 `complete_curriculum_mission` calls each) in
en, fr and rw, and deletes the test child at the end. Run with:

```
supabase db query --linked --file supabase/tests/achievement_certificate_system_test.sql
```

**Result: all 5 scenarios PASSED, zero residue.**

| # | Scenario | Result |
|---|---|---|
| 1 | **Full EN curriculum** (10 calls) → 8 `{category}-master-en` badges, 3 `level-{N}-complete-en` badges, `curriculum-complete-en` certificate all exist; Tier-4 (Trilingual) condition = **1/3** | **PASS** |
| 2 | **Full FR curriculum** (10 calls) → equivalent `-fr` set exists; `-en` set unchanged (still 8 masters / 3 levels); Tier-4 = **2/3** | **PASS** |
| 3 | **Full RW curriculum** (10 calls) → equivalent `-rw` set exists; **Tier-4 = 3/3 — Trilingual Champion unlocked** | **PASS** |
| 4 | **Duplicate-prevention** — re-run 8 of EN's completions (the 7 shared-placeholder categories + Level 3's "morning", all valid for a child saturated at Level 3 under migration 027's no-skip guard) → every `-en` badge/certificate row count unchanged (8 masters, 3 levels, 1 `curriculum-complete-en`, 1 `program-complete-en`); Tier-4 still 3/3 | **PASS** |
| 5 | **Cleanup** — test child deleted | **PASS** — `select count(*) from children where name = '__phase_bf_test_child__'` → `0` |

The DO block raised no exceptions (an `ASSERT` failure would raise
`P0001` and abort the whole transaction, including the cleanup delete) —
the zero-residue check above confirms the full block, including cleanup,
ran to completion.

---

## 2. Existing-progress spot-check (Ange)

Queried Ange (`113d8c38-a912-4739-97e9-c074feae65df`, `fr`) after the
implementation — **unchanged from before** (this phase added no writes):

| | Value |
|---|---|
| `child_achievements` rows (all languages) | `6` |
| `-fr` category-master badges | `5` (coloring, discovery, flipflop, histoire, movement) |
| `level-{N}-complete-fr` badges | `0` |
| `curriculum-complete-fr` certificate | `0` |
| `program-complete-fr` certificate | `1` |
| `max(level_number)` in `level_missions` | `3` |

Mapped onto the new dashboard, Ange's `/certificates` page would show:
- **Trilingual Champion banner**: locked, 0/3 (no `curriculum-complete-*`
  for any language yet).
- **🇫🇷 fr tab (her active language, shown by default)**: Language
  Explorer Certificate locked (no `curriculum-complete-fr`); 0/3 Explorer
  Badges (no `level-N-complete-fr`); 5/8 Category Master badges earned
  (coloring, discovery, flipflop, histoire, movement).
- **🇬🇧 en / 🇷🇼 rw tabs**: everything locked (no achievements recorded
  for those languages).

No destructive operations occurred anywhere in this phase — confirmed by
this spot-check (row count and slugs identical to the pre-implementation
baseline recorded in project memory).

---

## 3. TypeScript

`npx tsc --noEmit` — clean, zero errors, after all edits to
`lib/queries.ts`, `app/_achievementData.ts` (new),
`app/certificates/page.tsx`, `components/certificates/AchievementCard.tsx`
(new), `components/certificates/AchievementDashboard.tsx` (new),
`components/certificates/TrilingualChampionBanner.tsx` (new),
`components/certificates/CertificatesHeader.tsx`,
`components/home/MyBadges.tsx`, and `contexts/LanguageContext.tsx`.

---

## 4. Dev server / route checks

With the dev server running on port 3000:

| Route | Status |
|---|---|
| `/` | 200 |
| `/certificates` | 200 |

A headless-Chromium pass (Playwright) over both routes in the
**logged-out** state found **zero console/page errors** — confirming the
new `/certificates` rewrite, `AchievementDashboard`/`AchievementCard`/
`TrilingualChampionBanner` components, and the new `MyBadges` link don't
break hydration or throw when there is no active child yet (the page's
"no children yet" empty state guards correctly).

---

## 5. Interactive click-through (known limitation)

As with [Phase BC](./phase-bc-curriculum-verification.md) and
[Phase BD](./phase-bd-multilingual-verification.md), `/certificates`
requires an authenticated parent session with at least one child — no
test-account credentials are available in this environment, so the
language-tab switcher and per-tier card rendering for a real signed-in
child could not be click-tested end-to-end this session.

This is covered by:
- The SQL suite above, which proves the underlying data
  (`child_achievements` rows per tier/language, and the Tier-4
  derivation) is correct and duplicate-safe.
- The Ange spot-check, which maps real (non-zero) achievement data onto
  the dashboard's expected rendering for all 4 tiers across all 3
  language tabs.
- The zero-error logged-out Playwright pass, which proves the page,
  empty state, and component tree render without hydration/runtime
  errors.

Flagged for a future session with test credentials to do a live
click-through (verify the language tabs switch correctly, locked vs.
earned card styling, and the Trilingual Champion banner's earned-state
confetti animation).

---

## 6. Overall verdict

**Phase BF is complete.** No migration was required — the 4-tier
hierarchy (Explorer Badges, Category Master Badges, Language Explorer
Certificates, Trilingual Champion) maps entirely onto existing,
already-tested, language-scoped, duplicate-safe `child_achievements`
rows (Tiers 1-3) plus one new derived, read-only computation (Tier 4).
`/certificates` is now a real Achievement Dashboard instead of dead code,
linked from the homepage's `MyBadges` widget. The new automated SQL suite
proves all 4 tiers are earned/independent/duplicate-safe across
en/fr/rw, and Ange's existing 6 achievement rows are unchanged. Ready for
a future session with test credentials to do the live interactive
click-through.
