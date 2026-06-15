# Phase BH — Parent Intelligence Dashboard Verification Report

**Date:** 2026-06-14
**Scope:** Verification of the Phase BH implementation — see the
[architecture report](./phase-bh-parent-dashboard-architecture.md) for the
design. No migration was applied (none required).

---

## 1. SQL data-layer test suite

A new self-cleaning suite at
[`supabase/tests/parent_dashboard_test.sql`](../supabase/tests/parent_dashboard_test.sql)
(same `DO $$ ... ASSERT` pattern as `curriculum_progression_test.sql` /
`multilingual_journey_separation_test.sql`) creates one throwaway
`__phase_bh_test_child__` under the existing test parent
(`f4418058-9f83-4f3c-b74c-fbaed84cc059`), drives it through the **existing**
`complete_curriculum_mission` engine (migrations 026/027, untouched) across
independent en/fr/rw journeys, and asserts the raw shapes the Phase BH
query wrappers consume. Run with:

```
npx supabase db query --linked --file supabase/tests/parent_dashboard_test.sql
```

**Result: all 4 scenarios PASSED, zero residue.**

| # | Scenario | Result |
|---|---|---|
| 1 | **Per-language `get_current_level` separation** — en completes all 8 Level-1 categories → `get_current_level(child,'en') = 2`; fr completes 3/8 → `=1`; rw completes 0/8 → `=1` | **PASS** |
| 2 | **`child_progress` raw shape** (feeds `getAllChildProgress`) — en=8 rows, fr=3 rows, rw=0 rows; every row joins cleanly to `missions.category_slug` (no nulls) | **PASS** |
| 3 | **`level_missions` raw shape** (feeds `getLevelMissions`) — 8 rows at `level_number=1`, 8 distinct `category_slug`s | **PASS** |
| 4 | **`child_achievements` raw shape** (feeds `getChildAchievements`/`buildProgressTimeline`) — en: `level-1-complete-en` (1) + 7 `%-master-en` badges (the 8th, "morning", isn't earned because its 3-song rotation pool — Phase AA — requires all 3 songs, not just the Level-1 one); fr: 3 `%-master-fr` badges, 0 `level-1-complete-fr`; rw: 0 achievements | **PASS** |
| 5 | **Cleanup** — test child deleted, `child_progress`/`child_achievements` residue = 0 | **PASS** |

The `DO` block raised no exceptions and printed `ALL PHASE BH SCENARIOS
PASSED` (an `ASSERT` failure raises `P0001` and aborts the whole
transaction, including the cleanup `delete`) — the empty `rows: []` /
no-error result confirms the full block, including cleanup, ran to
completion.

Two real engine behaviors were discovered and the test expectations were
adjusted to match them (no engine code changed):
- **Shared-placeholder Level 2/3 design (Phase BC)**: 7/8 categories reuse
  Level 1's `mission_id` at Levels 2/3, so completing all 8 Level-1
  missions also completes 7/8 of Level 2 automatically — the test does
  *not* additionally complete a Level-2 mission, to keep `en` at Level 2
  (not 3).
- **"morning" 3-song rotation pool (Phase AA)**: the `morning-master-{lang}`
  badge requires all 3 pool songs done, not just the Level-1 one — hence
  7 (not 8) `en` category-master badges after completing all 8 Level-1
  missions.

---

## 2. TS fixture test suite (pure functions)

[`scripts/test-parent-insights.ts`](../scripts/test-parent-insights.ts) — 20
`node:assert`-based checks across all 7 `lib/parentInsights.ts` exports, no
database required (consistent with the documented no-test-credentials
pattern from Phases BC/BD/BF/BG). Run with:

```
npx tsx scripts/test-parent-insights.ts
```

**Result: `ALL TESTS PASSED (20)`**

| Group | Checks |
|---|---|
| 1. `computeStreaks` | empty set; active-today; active-only-yesterday; multi-day streak with a gap (current vs. longest differ) |
| 2. `computeLanguageJourney` | X/8 + completion % for a Level-2 fixture |
| 3. Language separation | en/fr/rw journeys built from one shared `allProgress` fixture, each correct with no cross-language leakage |
| 4. `computeOverview` | `onTrack` / `justStarting` / `complete` status transitions |
| 5. `buildProgressTimeline` | event typing/sorting, `program-complete-*` excluded, synthetic `languageStarted` present |
| 6. `computeLearningInsights` | `up`/`down`/`steady` trend fixtures; `levelMissions=[]` → `strongestCategory: null` (zero-state) |
| 7. `computeAttentionAlerts` | each of the 3 alert types — boundary cases at exactly 7/14 days (no trigger), >7/>14 (trigger), active-today suppresses `streakAtRisk` |

---

## 3. TypeScript

`npx tsc --noEmit` — clean, zero errors, after all edits to
`lib/queries.ts` (3 new exports), `lib/parentInsights.ts` (new),
`app/parents/page.tsx` (rewritten), the 6 new/changed
`components/parents/*.tsx`, removal of the 4 superseded mock files, and the
39×3 new `contexts/LanguageContext.tsx` keys. Re-checked clean again after
removing the temporary `/devpreview-parentdashboard` route (§5).

---

## 4. Dev server / route checks

With the dev server running on port 3000:

| Route | Status | Notes |
|---|---|---|
| `/parents` | 200 | SSR shell renders (client component, `mounted=false` on first paint — same as `/certificates`); no `next-error-h1`/global-error markers in the response body |
| `/devpreview-parentdashboard` (temporary) | 200 | Both fixture scenarios ("A — en active, Level 2, alerts present" and "B — rw active, just starting, no alerts") rendered their titles in the HTML; no error markers |

`npx tsc --noEmit` clean both before and after this check.

---

## 5. Browser verification — adjusted scope (known limitation)

The plan called for a Playwright pass over `/devpreview-parentdashboard`
across en/fr/rw checking for zero console/hydration errors. **No
Playwright/Chromium browser-automation tool was available in this
session** — `ToolSearch` for `"playwright browser navigate screenshot
console"` and `"chromium browser navigate page"` returned only unrelated
MCP tools (Figma/Gmail/Calendar/Drive/Vercel auth, `WebFetch`,
`TodoWrite`) — nothing capable of driving a real browser.

**Adjustment**: a `curl`-based HTTP smoke check (§4) confirmed both
`/devpreview-parentdashboard` and `/parents` return `200` with no
server-side error markers in the rendered HTML, and `npx tsc --noEmit`
stayed clean. The temporary `/devpreview-parentdashboard` route was then
removed.

This is a **new** limitation distinct from the "no test-account
credentials" limitation in Phases BC/BD/BF/BG (§6 below covers that one) —
it blocks live-DOM/console-error verification specifically, not
interactive click-throughs. Flagged for a future session where a
Playwright/Chromium tool is available.

---

## 6. Live spot-check (Ange, real production data)

Unlike prior phases' spot-checks (which only confirmed raw row counts),
Ange (`113d8c38-a912-4739-97e9-c074feae65df`, active language `rw`, created
`2026-06-09`) has enough real `child_progress`/`child_achievements` data
today that the **entire computed dashboard** can be traced end-to-end from
live data through `lib/parentInsights.ts`'s pure functions (read-only
queries, no data modified):

**Raw data** (`get_current_level` = 1 for all 3 languages; `level_missions`
max level = 3, i.e. `maxLevel=3`):

| Language | `child_progress` categories completed | Badges | Certificates |
|---|---|---|---|
| en | zoom, coloring (2) | 2 (`zoom-master-en`, `coloring-master-en`) | 0 |
| fr | flipflop, coloring, histoire, discovery, movement (5) | 5 (`%-master-fr`) | 1 (`program-complete-fr`) |
| rw | movement, artistic, discovery, histoire, zoom, flipflop (6) | 6 (`%-master-rw`) | 0 |

**Computed `journeyMap`** (via `computeLanguageJourney`, all non-"morning"
categories so each completed category's `mission_id` occupies 3 of the 24
`level_missions` slots):

| | currentLevel | levelProgress (Level 1) | completionPct | streak | lastActivityDate |
|---|---|---|---|---|---|
| en | 1 | 2/8 | 25% (6/24 slots) | 1 | 2026-06-14 (today) |
| fr | 1 | 5/8 | 63% (15/24 slots) | 2 | 2026-06-13 (1 day ago) |
| rw | 1 | 6/8 | 75% (18/24 slots) | 1 | 2026-06-14 (today) |

**Computed `overview`** (`computeOverview`, `child.language = 'rw'`):
`activeLanguage: "rw"`, `status: "onTrack"` (rw `completionPct=75% ≠ 0`, no
`curriculum-complete-rw`), `currentLevel: 1`, `maxLevel: 3`,
`totalCertificates: 1`, `totalBadges: 13` (2+5+6).

**Computed `timeline`** (`buildProgressTimeline`): 13 `categoryMaster`
events (2 en + 5 fr + 6 rw — `program-complete-fr` correctly excluded) + 3
synthetic `languageStarted` events (one per language, all having progress)
= **16 events**, newest first.

**Computed `insights`** (`computeLearningInsights`, `activeLanguage="rw"`):
- `strongestCategory`: 6-way tie at 67% (movement/artistic-adjacent
  categories each at 6/9 slots) → first in `ACTIVITIES` order =
  **`{ category: "movement", completionPct: 67 }`**.
- `mostActiveLanguage`: rw has the most `child_progress` rows (6) →
  **`"rw"`** (also the active language, so no tie-break needed).
- `longestStreak`: union activity dates `{06-12, 06-13, 06-14}` → 3
  consecutive days → **`3`**.
- `recentTrend`: all 13 completions fall in the last 7 days, 0 in the prior
  7 → **`"up"`**.

**Computed `alerts`** (`computeAttentionAlerts`, today = 2026-06-14):
**`[]` — no alerts.** All 3 languages have `daysSince(lastActivity) ≤ 1`
(not `>7`); all 3 languages are `daysSince(levelStartedAt) = 5` (not `>14`,
since `children.created_at = 2026-06-09`); the union streak (3) is alive
**and** `activeToday = true`, so `streakAtRisk` does not fire. → On
`/parents`, Ange's `AttentionAlertsCard` is correctly hidden today.

This end-to-end trace — from 3 raw tables/RPC through every exported
function in `lib/parentInsights.ts` to the exact props each of the 6 new
components would receive — confirms the full pipeline produces sane,
internally-consistent numbers against real (non-fixture) data, without
modifying anything.

---

## 7. Interactive click-through (known limitation, same as prior phases)

As with Phases BC/BD/BF/BG, `/parents` requires an authenticated parent
session — no test-account credentials are available in this environment,
so the live page (language journey cards, alert banners, achievement tiles,
timeline) could not be click-tested end-to-end in a real browser this
session. This is covered by:

- The SQL suite (§1), proving the 4 raw data shapes the dashboard depends
  on are correct and language-separated.
- The TS fixture suite (§2), proving all 7 pure aggregation functions are
  correct, including edge cases (zero-state, ties, boundary days).
- The live Ange trace (§6), which maps real production data through the
  entire pipeline to the exact values every component would render today.
- The `curl`/`tsc` smoke check (§4-5), proving the page and its components
  compile and render server-side without errors.

Flagged for a future session with test credentials **and** a
Playwright/Chromium tool to do a live click-through (verify alert banner
styling, language-card layout at mobile/tablet/desktop breakpoints, and the
timeline's chronological ordering in the real DOM).

---

## 8. Overall verdict

**Phase BH is complete.** No migration was required. `/parents` is now a
real, read-only Parent Intelligence Dashboard — Overview, 3 per-language
Journey cards, Achievement Center, Learning Insights, Progress Timeline,
and conditional Attention Alerts — built entirely from existing
curriculum/achievement data via 3 new query wrappers and one new pure
aggregation module. The SQL suite proves the data layer, the TS fixture
suite proves the aggregation logic (20/20), `tsc` is clean, and a live
trace against Ange's real data confirms the whole pipeline produces correct
output today. Ready for a future session with test credentials and a
browser-automation tool to complete the interactive/visual verification.
