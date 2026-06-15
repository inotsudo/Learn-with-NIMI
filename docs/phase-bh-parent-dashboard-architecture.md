# Phase BH — Parent Intelligence Dashboard Architecture Report

**Date:** 2026-06-14
**Scope:** Replace the mock "Parents Zone" page (`app/parents/page.tsx` +
`components/parents/{ChildProgressCard,RecentActivitiesCard,WeeklyOverviewCard,_parentsData}`,
built in Phase M against a static mockup with hardcoded numbers like
`OVERALL_PROGRESS_PCT = 75`) with a real, data-driven **Parent Intelligence
Dashboard** that aggregates the curriculum + achievement data Phases
BB-BG already produce.

**Zero changes** to `level_missions` / `get_current_level` /
`get_curriculum_missions` / `complete_curriculum_mission` /
`child_achievements`-writing logic. This phase is purely additive and
read-only: 3 new query wrappers, 1 new pure-aggregation module, 6 new
components, and a page rewrite that wires them together.

---

## 1. Audit: what already existed

By Phase BG the curriculum engine already tracks, per `(child_id,
language)`:

- `level_missions (level_number, category_slug, mission_id)` — the
  curriculum map, ~24 rows (3 levels × 8 categories), readable by any
  authenticated user (migration 026 policy).
- `child_progress (child_id, mission_id, language, stars_earned,
  completed_at)` — every completed mission, across all 3 language
  journeys, parent-readable via the existing `is_my_child()` RLS policy
  (same table `getCompletedMissionIds` already reads, just without its
  `.eq("language", ...)` filter).
- `child_achievements (child_id, language, type, slug, earned_at)` — the
  Phase BF 4-tier badge/certificate catalog (`level-{N}-complete-{lang}`,
  `{category}-master-{lang}`, `curriculum-complete-{lang}`,
  `program-complete-{lang}`).
- `get_current_level(child_id, language)` RPC (migration 026) — the
  authoritative current level per language journey, saturating at
  `maxLevel`.

**The gap:** `/parents` never read any of this — it rendered
`_parentsData.ts`'s static `OVERALL_PROGRESS_PCT`, a fake 7-day activity
bar chart, and fake "Recent Activities" text, regardless of the signed-in
child's real state.

---

## 2. New read-only query wrappers — `lib/queries.ts`

Three new exports, alongside the existing Phase BD/BF helpers (no existing
function modified):

```ts
export interface LevelMissionRow {
  level_number: number;
  category_slug: ActivityCategory;
  mission_id: string;
}
export async function getLevelMissions(): Promise<LevelMissionRow[]>
// select level_number, category_slug, mission_id from level_missions

export interface ProgressRow {
  mission_id: string;
  language: "en" | "fr" | "rw";
  category: ActivityCategory;   // joined from missions.category_slug
  stars_earned: number;
  completed_at: string;
}
export async function getAllChildProgress(childId: string): Promise<ProgressRow[]>
// select mission_id, language, stars_earned, completed_at, missions(category_slug)
// from child_progress where child_id = ... — ALL languages, ALL rows.

export async function getCurrentLevel(childId: string, language: "en"|"fr"|"rw"): Promise<number>
// select get_current_level(p_child_id, p_language) — thin RPC wrapper.
```

All three live in a new `// ── Parent Intelligence Dashboard (Phase BH) ──`
section at the bottom of `lib/queries.ts` ([lib/queries.ts:584-648](../lib/queries.ts#L584-L648)),
mirroring the existing `getMaxCurriculumLevel()` (added in Phase BF) which
the dashboard also reuses unchanged.

---

## 3. New pure aggregation module — `lib/parentInsights.ts`

All functions are pure (no Supabase calls, no engine logic re-derived) —
they consume the raw rows above plus `Child`/`ChildAchievement` and the
Phase BF catalog helpers (`buildAchievementCatalog`/`getEarnedMap`/
`getTrilingualStatus` from `app/_achievementData.ts`, reused as-is by
`AchievementCenterCard`). `get_current_level`'s result is taken as given,
never recomputed.

### Streaks

```ts
export interface StreakInfo { current: number; activeToday: boolean; longest: number; }
export function computeStreaks(activityDates: Set<string>, today?: Date): StreakInfo
```
`current` counts backward from today (if active today) or yesterday;
`longest` is the longest run of consecutive days anywhere in the set.
Shared by `computeLanguageJourney` (per-language streak) and
`computeLearningInsights`/`computeAttentionAlerts` (union-of-all-languages
streak).

### Per-language journey (Requirement 2)

```ts
export interface LanguageJourney {
  language: Lang;
  currentLevel: number;                          // from getCurrentLevel RPC
  levelProgress: { done: number; total: number }; // X/8 for currentLevel
  completionPct: number;                          // done-slots / total-slots, ALL levels, 0-100
  streak: number;
  lastActivityDate: string | null;                // "YYYY-MM-DD"
}
export function computeLanguageJourney(
  language: Lang, currentLevel: number,
  levelMissions: LevelMissionRow[], progressForLang: ProgressRow[], today?: Date
): LanguageJourney
```

`levelProgress` filters `level_missions` to `level_number === currentLevel`
and counts how many of those `mission_id`s are in
`progressForLang`. `completionPct` is `doneAllSlots / levelMissions.length`
— note that because 7/8 categories share the same `mission_id` across all
3 levels (Phase BC's shared-placeholder design), completing one non-"morning"
category's Level-1 mission counts as 3 "slots" done (once per level it
appears in), so `completionPct` rises faster than `levelProgress` alone for
those categories.

### Overview (Requirement 1)

```ts
export type OverallStatus = "complete" | "onTrack" | "justStarting";
export interface OverviewSummary {
  activeLanguage: Lang; status: OverallStatus;
  currentLevel: number; maxLevel: number;
  totalCertificates: number; totalBadges: number;
}
export function computeOverview(
  child: Pick<Child, "language">, achievements: ChildAchievement[],
  journeys: Record<Lang, LanguageJourney>, maxLevel: number
): OverviewSummary
```

`status`: `"complete"` if `curriculum-complete-{activeLanguage}` exists,
`"justStarting"` if the active language's `completionPct === 0`, else
`"onTrack"`. `totalCertificates`/`totalBadges` are simple
`type === "certificate" | "badge"` counts across **all** languages (lifetime
totals, matching the Achievement Center's framing).

### Progress timeline (Requirement 4)

```ts
export type TimelineEventType = "levelComplete" | "categoryMaster" | "languageCert" | "languageStarted";
export interface TimelineEvent {
  type: TimelineEventType; language: Lang; earnedAt: string;
  level?: number; category?: ActivityCategory;
}
export function buildProgressTimeline(achievements: ChildAchievement[], allProgress: ProgressRow[]): TimelineEvent[]
```

Parses `child_achievements` slugs with the same regexes as
`buildAchievementCatalog`'s scope (`level-{N}-complete-{lang}`,
`{category}-master-{lang}`, `curriculum-complete-{lang}`).
`program-complete-*` is **intentionally excluded** — it isn't part of the
Phase BF learner-facing catalog either, and including it would produce a
near-duplicate entry for the same "finished everything published" moment.
A synthetic `languageStarted` event is added per language using the
earliest `completed_at` in `allProgress` for that language (only if the
language has any progress at all). Sorted `earnedAt` descending (newest
first).

### Learning insights (Requirement 5)

```ts
export interface LearningInsights {
  strongestCategory: { category: ActivityCategory; completionPct: number } | null;
  mostActiveLanguage: Lang | null;
  longestStreak: number;
  recentTrend: "up" | "steady" | "down";
}
export function computeLearningInsights(
  levelMissions: LevelMissionRow[], allProgress: ProgressRow[],
  activeLanguage: Lang, today?: Date
): LearningInsights
```

- `strongestCategory`: for each `ACTIVITIES` category, `totalSlots =
  (level_missions rows for that category) × 3 languages`; `done` = how many
  of those `(slot, language)` pairs are completed; picks the highest
  `completionPct`. `null` if `levelMissions` is empty (no slots defined at
  all — the dashboard's zero-state).
- `mostActiveLanguage`: language with the most `child_progress` rows; ties
  prefer `activeLanguage` if it's among the tied languages, else the first
  in `LANGUAGES` order (`en`, `fr`, `rw`). `null` if there's no progress at
  all.
- `longestStreak`: `computeStreaks` on the **union** of all 3 languages'
  activity dates — `.longest`, not `.current`.
- `recentTrend`: completions in the last 7 days vs. the 7 days before that,
  across all languages — `"up"`/`"down"`/`"steady"`.

### Attention alerts (Requirement 6)

```ts
export type AlertType = "languageInactive" | "levelIncomplete" | "streakAtRisk";
export interface DashboardAlert {
  type: AlertType; language?: Lang; level?: number;
  daysSince?: number; currentStreak?: number;
}
export function computeAttentionAlerts(
  child: Pick<Child, "created_at">, journeys: Record<Lang, LanguageJourney>,
  achievements: ChildAchievement[], allProgress: ProgressRow[], today?: Date
): DashboardAlert[]
```

- **`languageInactive`**: a language journey has `lastActivityDate` set
  (i.e. some progress exists) AND it's been `> 7` days since.
- **`levelIncomplete`**: `levelProgress.done < levelProgress.total` AND
  it's been `> 14` days since the child arrived at the current level —
  "arrived at" = `child_achievements["level-{currentLevel-1}-complete-{lang}"].earned_at`
  if `currentLevel > 1`, else `children.created_at` for level 1.
- **`streakAtRisk`**: a **single overall** alert (not per-language) — the
  union-of-all-languages streak is `> 0` (alive as of yesterday) but
  nothing has been completed **today** yet.

Note the final signature takes 5 params (4 data + optional `today`), one
fewer than the original plan sketch (`levelMissions`/`maxLevel` were
dropped — neither alert type needs them once `journeys` already carries
`levelProgress`).

---

## 4. `/parents` page rewrite

`app/parents/page.tsx` ([app/parents/page.tsx](../app/parents/page.tsx))
follows the same `mounted` / `hasChildren` / `loadError` + `reloadKey`
try/catch/retry pattern as `/certificates` and
`app/missions/[category]/page.tsx`.

**Load sequence**: `getChildren()` → pick the active child (via
`nimipiko_active_child` localStorage, falling back to `list[0]`) → in
parallel: `getLevelMissions()`, `getAllChildProgress(child.id)`,
`getChildAchievements(child.id)`, `getMaxCurriculumLevel()`, and
`getCurrentLevel(child.id, lang)` for `en`/`fr`/`rw`. Then, for each
`LANGUAGES` entry, `computeLanguageJourney(lang, currentLevels[lang],
levelMissions, allProgress.filter(r => r.language === lang))` builds
`journeyMap: Record<Lang, LanguageJourney>`. Finally `computeOverview`,
`buildProgressTimeline`, `computeLearningInsights`, and
`computeAttentionAlerts` derive the page's remaining state from
`journeyMap` + the raw rows.

**Self-consistent zero-state**: rather than hand-writing a parallel set of
"empty" literals, the module-level defaults are computed from the same pure
functions with empty inputs:

```ts
const EMPTY_JOURNEYS: Record<Lang, LanguageJourney> = LANGUAGES.reduce((acc, lang) => {
  acc[lang] = computeLanguageJourney(lang, 1, [], []);
  return acc;
}, {} as Record<Lang, LanguageJourney>);
const EMPTY_OVERVIEW: OverviewSummary = computeOverview({ language: "en" }, [], EMPTY_JOURNEYS, 3);
const EMPTY_INSIGHTS: LearningInsights = computeLearningInsights([], [], "en");
```

This guarantees the loading/empty state can never drift out of sync with
what the real aggregation would produce for "no data yet" (e.g.
`strongestCategory: null`, `completionPct: 0`).

**Layout** (mobile-first — single column, widens at `sm`/`lg`):

```
<AppShell>
  <ParentsZoneHeader />                                  (existing, unchanged)
  {alerts.length > 0 && <AttentionAlertsCard alerts={alerts} />}
  <ParentOverviewCard overview childName avatarUrl />
  <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {LANGUAGES.map(lang => <LanguageJourneyCard journey={journeyMap[lang]} maxLevel isActive={lang === overview.activeLanguage} />)}
  </section>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <AchievementCenterCard achievements maxLevel childName />
    <LearningInsightsCard insights />
  </div>
  <ProgressTimelineCard events={timeline} />
</AppShell>
```

---

## 5. New components — `components/parents/`

| Component | Responsibility |
|---|---|
| `AttentionAlertsCard.tsx` | One row per `DashboardAlert`, color-coded (amber for `languageInactive`/`levelIncomplete`, red for `streakAtRisk`), i18n message via `fillTemplate`. Parent page hides the whole card when `alerts.length === 0`. |
| `ParentOverviewCard.tsx` | Child avatar/name, active-language flag (`LANGUAGE_META`), status badge (`complete`/`onTrack`/`justStarting` → emoji + i18n label, color-coded), "Level N of M", 2-tile stat grid (certificates, badges). |
| `LanguageJourneyCard.tsx` | One per language: flag + name header, "active" badge if `isActive`, "Level X of Y", X/8 progress bar, 🔥 streak, last-activity date (or "Not started yet"), completion % bar. |
| `AchievementCenterCard.tsx` | 3 stat tiles (Explorer Badges, Category Masters, Language Certificates) via `buildAchievementCatalog`/`getEarnedMap` (Phase BF, reused as-is), `TrilingualChampionBanner` (reused from `components/certificates/`), "View Full Achievement Dashboard →" link to `/certificates`. |
| `LearningInsightsCard.tsx` | 4 rows: strongest category (emoji + % from `ACTIVITIES`), most active language (flag), longest streak (🔥), recent trend (📈/➡️/📉 via i18n label). Each shows `noDataYetLabel` when `null`. |
| `ProgressTimelineCard.tsx` | Vertical list, newest first, type-specific emoji + i18n template (`fillTemplate`) per `TimelineEvent`. Empty state: `timelineEmptyState`. |
| `ParentsZoneHeader.tsx` | **Unchanged** — kept as-is per the plan. |

**Removed** (fully superseded mock-data files, confirmed zero remaining
references via grep): `components/parents/ChildProgressCard.tsx`,
`RecentActivitiesCard.tsx`, `WeeklyOverviewCard.tsx`, `_parentsData.ts`.

---

## 6. i18n — `contexts/LanguageContext.tsx`

39 new keys × 3 languages (en/fr/rw) = 117 entries, covering:

- **Overview**: `overviewSectionTitle`, `overviewActiveLanguageLabel`,
  `overviewStatusComplete`/`overviewStatusOnTrack`/`overviewStatusJustStarting`,
  `levelOfMaxLabel`, `overviewCertificatesLabel`, `overviewBadgesLabel`.
- **Language Journey cards**: `activeLanguageBadge`, `missionsProgressLabel`,
  `dayStreakLabel`, `lastActivityLabel`, `journeyNotStartedYet`,
  `completionLabel`.
- **Achievement Center**: `achievementCenterTitle`,
  `explorerBadgesSectionTitle` (reused from Phase BF),
  `categoryMasterBadgesSectionTitle` (reused), `languageExplorerCertSectionTitle`
  (reused), `viewFullAchievementDashboard`.
- **Learning Insights**: `learningInsightsTitle`, `strongestCategoryLabel`,
  `noDataYetLabel`, `mostActiveLanguageLabel`, `longestStreakLabel`,
  `recentTrendLabel`, `trendUp`/`trendSteady`/`trendDown`.
- **Progress Timeline**: `progressTimelineTitle`, `timelineEmptyState`,
  `timelineLevelComplete`, `timelineCategoryMaster`, `timelineLanguageCert`,
  `timelineLanguageStarted` (all `fillTemplate`-templated).
- **Attention Alerts**: `attentionAlertsTitle`, `alertLanguageInactive`,
  `alertLevelIncomplete`, `alertStreakAtRisk` (all `fillTemplate`-templated).
- `parentsZoneSubtitle` (header subtitle).

`fillTemplate()` (Phase BF, `app/_achievementData.ts`) is reused as-is for
`{placeholder}` substitution — no new templating helper.

---

## 7. Regression safety

No file under `supabase/migrations/`, no RPC, and no write path
(`complete_curriculum_mission`, `child_achievements` inserts) was touched.
Every new read either:

- selects from a table already covered by an existing RLS read policy
  (`level_missions`: any authenticated user, migration 026;
  `child_progress`/`child_achievements`: `is_my_child()`-based parent-read,
  already used by `getCompletedMissionIds`/`getChildAchievements`), or
- calls the existing `get_current_level` RPC unchanged.

`app/parents/page.tsx` is the only page modified; no other route, widget,
or shared component (`AppShell`, homepage widgets, `/missions/*`,
`/certificates`) was changed. See the
[verification report](./phase-bh-parent-dashboard-verification.md) for test
results.
