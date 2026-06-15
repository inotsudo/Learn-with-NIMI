# Phase BI — Admin Analytics & Educator Insights Verification Report

**Date:** 2026-06-14

This report verifies the deliverables described in
[phase-bi-admin-analytics-architecture.md](./phase-bi-admin-analytics-architecture.md):
migration 031 (`language_switch_log`), the `lib/adminAnalytics.ts`
reporting engine (5 `compute*` functions), `app/admin/exportUtils.ts`,
5 new analytics tab components, and the `AnalyticsManager.tsx` tab/fetch/
export wiring.

---

## 1. SQL data-layer test suite

`supabase/tests/admin_analytics_test.sql` — self-cleaning `DO $$ ...
ASSERT ... end $$` block against the live database (test parent
`f4418058-9f83-4f3c-b74c-fbaed84cc059`), run via:

```
npx supabase db query --linked --file supabase/tests/admin_analytics_test.sql
```

| # | Scenario | Result |
|---|---|---|
| 1 | Insert `en→fr` then `fr→rw` rows into `language_switch_log` for a throwaway test child → row count = 2, both rows have correct `from_language`/`to_language`/non-null `switched_at` | PASS |
| 2 | Insert a row with an invalid language code (`'xx'`) → rejected by the `check (... in ('en','fr','rw'))` constraint (`check_violation` caught) | PASS |
| 3 | `pg_policies` contains `"parent: select own switch log"` (using `is_my_child`), `"parent: insert own switch log"` (`with check` using `is_my_child`), and `"admin: full access"` (`is_admin` on both `using`/`with check`) for `language_switch_log` | PASS |

Final `raise notice 'ALL PHASE BI SCENARIOS PASSED'` reached. The test
child is deleted at the end (cascades `language_switch_log`); a re-run
returned `"rows": []` with no error — **zero residue, all 3 scenarios
PASS**.

---

## 2. TypeScript fixture test suite

`scripts/test-admin-analytics.ts` — fixture-based `node:assert` unit tests
for all 5 `compute*` functions in `lib/adminAnalytics.ts`, no DB/network
access, run via:

```
npx tsx scripts/test-admin-analytics.ts
```

| Group | Checks | Result |
|---|---|---|
| `computeLearnerAnalytics` | zero-state all-zero; `totalLearners` counts all children regardless of progress; active/daily/weekly buckets via `completed_at` recency; weekly boundary (`since=6` included, `since=7` excluded) | 4/4 PASS |
| `computeCurriculumAnalytics` | zero-state (no `level_missions` → `maxLevel=0`, empty stats); `level_missions` present but zero progress → `reached`/`completed` all 0, `dropOffRate=0` not `NaN`; single journey partial Level 1 (5/8 categories) → reached L1, not completed, per-category rates correct; multi-journey with shared Level-2/3 placeholders (mirrors real Phase BC curriculum — 7/8 categories reuse Level-1's `mission_id`) → 3-journey funnel (`level1 reached:3/completed:2`, `level2 reached:2/completed:1`, `level3 reached:1/completed:1`), drop-off rates via `closeTo`, `avgTimeToCompleteLevel1Days ≈ 3.5` | 4/4 PASS |
| `computeLanguageAnalytics` | zero-state usage rows for all 3 languages, all zero; usage derived correctly from `children.language` + progress across 4 children; switch frequency + `topSwitchPairs` sorted desc capped at 3 (8 switches, 4 pairs → `[{en,fr,3},{en,rw,2},...]`); `switchesPerActiveLearner=0` when no active learners | 4/4 PASS |
| `computeAchievementAnalytics` | zero-state all-zero, empty slug lists; certificates/badges grouped by slug and sorted by count desc (no ties); `trilingualChampionCount` only counts children with all 3 `curriculum-complete-{en,fr,rw}` certs | 3/3 PASS |
| `computeContentAnalytics` | zero-state all-zero status counts, empty-but-shaped translation coverage; status pipeline counts (`draft:2, review:1, published:3, archived:1, total:7`) + per-language translation coverage percentages (`en:50%, fr:25%, rw:0%`) across 4 missions / 7 versions | 2/2 PASS |

```
ALL TESTS PASSED (17)
```

---

## 3. TypeScript

```
npx tsc --noEmit
```

Clean — no output, no errors across the new files (`lib/adminAnalytics.ts`,
`app/admin/exportUtils.ts`, `app/admin/StatCard.tsx`, the 5 new
`*AnalyticsTab.tsx` files) and the updated `AnalyticsManager.tsx` /
`lib/queries.ts`.

---

## 4. Dev server / route check

```
curl -s -o /tmp/admin_page.html -w "HTTP %{http_code}\n" http://localhost:3000/admin
```

→ `HTTP 200`, 19,127 bytes. The only `error`-matching strings in the
response are Next.js's standard global-error-boundary scaffolding
(`global-error.js`, `next-error-h1` CSS class, `"errorStyles":"$undefined"`
placeholders) present on every Next.js page — no application-level error
text or stack traces.

---

## 5. Browser verification — limitation

As with prior phases (Phase BG/BH), no Playwright/Chromium browser tool was
available in this environment. Interactive click-through of the new tab bar
(Overview/Learners/Curriculum/Languages/Achievements/Content), per-tab CSV
export buttons, and the header "Export Full Report (XLSX)" button — which
require a real admin session and trigger browser file downloads — could not
be exercised directly. The route-level (`curl`) and data-layer (SQL +
TS fixture + live trace) checks above substitute for this, consistent with
the adjustment used in Phase BH.

---

## 6. Live data trace against production data

A one-off read-only trace (`/tmp/bi_trace.sql` → `npx supabase db query
--linked -o json` → `/tmp/bi_live_trace.ts` via `npx tsx`) pulled every raw
table consumed by `AnalyticsManager` from the live database and ran all 5
`compute*` functions against it with `today = 2026-06-14`.

Raw counts (single real child, "Ange", `language='rw'`):

```
{ children: 1, progress: 13, achievements: 14, missionVersions: 18, levelMissions: 24, switches: 0 }
```

### Learner Analytics
```
{ totalLearners: 1, activeLearners: 1, dailyActiveLearners: 1, weeklyActiveLearners: 1 }
```
Correct — Ange's only child row, with progress completed today.

### Curriculum Analytics
- `maxLevel: 3`, `totalJourneys: 3` (Ange has en/fr/rw journeys — Phase BD
  multilingual separation: each `(child, language)` pair is its own
  journey).
- `levelStats`: Level 1 `reached: 3, completed: 0` (no journey has finished
  all 8 Level-1 categories yet) → `dropOff[1].dropOffRate = 1`; Levels 2/3
  `reached: 0, completed: 0, dropOffRate: 0` (not `NaN` — the `reached===0`
  guard works on real data).
- `categoryStats`: `morning: 0 learners` (Ange hasn't completed a "morning"
  mission in any language — consistent with Phase AA's pilot being
  RW-first/in-progress), the other 7 categories at `2/3` learners
  (`completionRate ≈ 0.667`) — matches "2 of Ange's 3 language journeys
  have completed that category's Level-1 mission."
- `avgTimeToCompleteLevel1Days: null` — correct, since no journey has
  completed Level 1 yet (matches "0 completed" above).

### Language Analytics
```
usage: en {activeChildren:0, learners:1, completions:2}, fr {0,1,5}, rw {1,1,6}
totalSwitches: 0, childrenWhoSwitched: 0, switchesPerActiveLearner: 0, topSwitchPairs: []
```
`activeChildren.rw = 1` matches Ange's current `children.language = 'rw'`.
`totalSwitches: 0` is correct — `language_switch_log` is new (migration 031
applied this phase) and Ange has not switched language since it went live.

### Achievement Analytics
```
certificatesEarned: 1 → certificatesBySlug: [{slug:"program-complete-fr", count:1}]
badgesEarned: 13 → 13 distinct *-master-{en,fr,rw} slugs, each count:1
trilingualChampionCount: 0
```
`trilingualChampionCount: 0` is correct: this metric counts
`curriculum-complete-{en,fr,rw}` certificates (Phase BF/Phase BG-curriculum
slugs, requiring **all 3 curriculum levels** complete in a language), which
is distinct from the `program-complete-fr` cert Ange already has (an older
program-level achievement). Ange's furthest journey (rw) is at 6/8 Level-1
categories — not yet eligible for any `curriculum-complete-*` cert, so `0`
is the expected value, not a slug-mismatch bug.

### Content Analytics
```
statusCounts: { draft: 1, review: 0, published: 17, archived: 0, total: 18 }
translationCoverage: en {published:10, totalMissions:10, pct:100}, fr {4,10,40}, rw {3,10,30}
```
Matches the known Phase BG/BH curriculum state: 10 missions total, fully
published in English, partial FR/RW translation coverage (consistent with
"morning" RW lyrics being first-draft per the [[project_nimipiko_redesign]]
Phase AA addendum, and several other categories still mid-translation).

**All 5 domains produce internally-consistent, sane output against real
production data — no discrepancies found.**

---

## Summary

| Check | Result |
|---|---|
| SQL test suite (`admin_analytics_test.sql`, 3 scenarios) | PASS, zero residue |
| TS fixture suite (`test-admin-analytics.ts`, 17 checks) | ALL PASSED |
| `npx tsc --noEmit` | Clean |
| `/admin` route | HTTP 200, no application errors |
| Browser click-through (tabs/export buttons) | Not available (no Playwright tool) — substituted with route/data-layer checks |
| Live trace vs. real data (Ange) | All 5 domains correct and internally consistent |

Phase BI is verified and ready for the memory update.
