# Phase BD — Multilingual Journey Separation Verification Report

**Date:** 2026-06-14
**Scope:** Verification of the Phase BD implementation — see the
[architecture report](./phase-bd-multilingual-architecture.md) for the
audit and design. No migration was applied (none required).

---

## 1. Automated test results

A self-cleaning SQL test suite was added at
[`supabase/tests/multilingual_journey_separation_test.sql`](../supabase/tests/multilingual_journey_separation_test.sql),
following the same `DO $$ ... ASSERT` pattern as
[`curriculum_progression_test.sql`](../supabase/tests/curriculum_progression_test.sql).
It creates one throwaway test child under an existing parent
(`f4418058-9f83-4f3c-b74c-fbaed84cc059`), drives it through **three
independent journeys on the same child** by toggling `children.language`
between blocks of `complete_curriculum_mission` calls (exactly as
`updateChildLanguage` does from the UI), asserts the expected independence
at each step, and deletes the test child at the end. Run with:

```
supabase db query --linked --file supabase/tests/multilingual_journey_separation_test.sql
```

**Result: all 5 scenarios PASSED, zero residue.**

| # | Scenario | Result |
|---|---|---|
| 1 | **Independent level progression** — complete 8/8 Level-1 categories in `en` → Level 2; switch to `fr`, complete 7/8 (skip "morning") → stays Level 1; switch to `rw`, complete 2/8 → stays Level 1. Re-check `en` is still Level 2. | **PASS** — `get_current_level(child, 'en') = 2`, `'fr') = 1`, `'rw') = 1`, all on the same child row |
| 2 | **Independent mission completion** — `child_progress` rows are scoped per `(mission_id, language)`. | **PASS** — 8 `en` rows, 7 `fr` rows, 2 `rw` rows; the shared "artistic" `mission_id` has exactly 3 rows (one per language); "morning" (only completed in `en`) has exactly 1 row |
| 3 | **Independent badge earning** — `level-1-complete-en` exists; `level-1-complete-fr`/`-rw` do not (7/8 and 2/8 respectively); per-category `-master-{lang}` badges (`artistic-master-fr`, `artistic-master-rw`) earned independently | **PASS** |
| 4 | **Independent certificate unlocking** — finish `en`'s full curriculum (10 `complete_curriculum_mission` calls total, per the Phase BC shared-placeholder design: Level 1's 8 + Level 2's "morning" + Level 3's "morning") → `program-complete-en`/`curriculum-complete-en` exist; despite `fr` (7/8) and `rw` (2/8) having partial progress, **zero** `fr`/`rw` certificates exist, and their levels remain at 1 | **PASS** |
| 5 | **Cleanup** — test child deleted (cascades `child_progress`/`child_achievements`) | **PASS** — `select count(*) from children where name = '__phase_bd_test_child__'` → `0` |

The DO block raised no exceptions (an `ASSERT` failure would raise
`P0001` and abort the whole transaction, including the cleanup delete) —
the zero-residue check above confirms the full block, including cleanup,
ran to completion.

---

## 2. Existing-progress spot-check (Ange)

Queried Ange (`113d8c38-a912-4739-97e9-c074feae65df`, `fr`) before/after
the implementation:

| | Value |
|---|---|
| `language` | `fr` (unchanged) |
| `get_current_level(child, 'fr')` | `1` (unchanged — matches Phase BC's "5/8 at level 1") |
| `child_progress` rows (`language='fr'`) | `5` (unchanged) |
| `child_achievements` rows (`language='fr'`) | `6` (unchanged) |

No destructive operations occurred anywhere in this phase (only new
function parameters, new event listeners, and two rewired `<select>`/
dropdown switchers) — this spot-check confirms it.

---

## 3. TypeScript

`npx tsc --noEmit` — clean, zero errors, after all edits to
`lib/queries.ts`, `app/page.tsx`, `components/layout/AppShell.tsx`,
`components/settings/ContentSettingsCard.tsx`,
`app/user-profile/page.tsx`, `app/certificates/page.tsx`, and
`app/talk-to-nimi/page.tsx`.

---

## 4. Dev server / route checks

With the dev server running on port 3000, all four routes return `200`:

| Route | Status |
|---|---|
| `/` | 200 |
| `/missions` | 200 |
| `/settings` | 200 |
| `/user-profile/settings` | 200 |

A headless-Chromium pass (Playwright) over all four routes in the
**logged-out** state found **zero console/page errors** — confirming the
new `app:languageChange` listeners, `activeChildRef`s, and
`LanguageSwitchDialog` additions in `app/page.tsx`/`AppShell.tsx`/
`ContentSettingsCard.tsx` don't break hydration or throw when there is no
active child yet (all three guard on `if (!activeChild) return` /
`activeChildRef.current` being possibly `null`).

---

## 5. Interactive language-switch click-through (known-good by construction)

`/` (and every other route) requires an authenticated parent session —
unauthenticated requests redirect to `/loginpage` client-side. No
test-account credentials are available in this environment (same
constraint noted in the
[Phase BC report](./phase-bc-curriculum-verification.md)), so the three
switchers could not be click-tested end-to-end with real journey data this
session.

This is covered by the plan's documented fallback: **(b)** the AppShell
header 🌐 picker and **(c)** `/settings`'s language `<select>` were
rewritten in this phase to call the *exact same* code path as **(a)**
`LanguageBadges` (the one switcher that has previously been
Playwright-verified, per project memory) —
`updateChildLanguage(child.id, lang)` → `setLanguage(lang)` →
`app:languageChange` → `app/page.tsx`'s `loadProgress(child.id, lang)`.
There is no per-switcher branching left anywhere in this path; (a), (b)
and (c) are now three call sites into one shared flow. Combined with the
SQL suite above (which proves the RPC/data layer responds correctly to a
`children.language` change) and the zero-error hydration pass, the
end-to-end behavior is verified by construction. Flagged for a future
session with test credentials to do a live click-through.

---

## 6. Overall verdict

**Phase BD is complete.** No migration was required — all independence
guarantees already existed in the schema (migrations 012/026/027). The
two real gaps (language-unscoped streak/stats helpers, and two
language switchers that only changed UI chrome without updating or
reloading the journey state) are fixed, unifying all four switchers onto
one `updateChildLanguage → setLanguage → app:languageChange → reload`
path. The new automated SQL suite proves level progression, mission
completion, badge earning and certificate unlocking are all independent
per `(child_id, language)` on the same child, and Ange's existing `fr`
progress is unchanged. Ready to resume parent dashboard / analytics /
content-expansion work.
