# Phase BI — Admin Analytics & Educator Insights Architecture Report

**Date:** 2026-06-14
**Scope:** Extend the admin portal's "Analytics" page
(`app/admin/AnalyticsManager.tsx`, Round 12, indigo accent) — previously a
single dashboard built from `child_progress` (14-day activity trend,
per-category/per-language completion, top-learners leaderboard, recent
activity) — with 5 new analytics domains (Learner, Curriculum, Language,
Achievement, Content), CSV/XLSX export tooling, and one small additive
schema change for language-switch tracking.

This phase is purely additive/read-only except for one new table
(`language_switch_log`, migration 031) and one extended write path
(`updateChildLanguage`). No existing curriculum/achievement/content RPC was
changed.

---

## 1. New migration 031 — `language_switch_log`

[supabase/migrations/031_language_switch_log.sql](../supabase/migrations/031_language_switch_log.sql)
adds a small append-only log table:

```sql
create table language_switch_log (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null references children(id) on delete cascade,
  from_language text not null check (from_language in ('en', 'fr', 'rw')),
  to_language   text not null check (to_language in ('en', 'fr', 'rw')),
  switched_at   timestamptz default now()
);
create index on language_switch_log (child_id);
alter table language_switch_log enable row level security;
```

RLS follows the same `is_my_child()` / `is_admin()` convention used by
every other per-child table since migrations 001/013:

- `"parent: select own switch log"` — `using (is_my_child(child_id))`
- `"parent: insert own switch log"` — `with check (is_my_child(child_id))`
- `"admin: full access"` — `using (is_admin()) with check (is_admin())`

### Write path — `lib/queries.ts:230-250`

`updateChildLanguage(childId, language)` now reads the child's *current*
`language` before updating it, and — only if the language actually
changed — inserts one `language_switch_log` row:

```ts
export async function updateChildLanguage(childId: string, language: "en" | "fr" | "rw"): Promise<void> {
  const { data: current } = await supabase.from("children").select("language").eq("id", childId).maybeSingle();
  await supabase.from("children").update({ language }).eq("id", childId);
  const fromLanguage = current?.language as "en" | "fr" | "rw" | undefined;
  if (fromLanguage && fromLanguage !== language) {
    await supabase.from("language_switch_log").insert({ child_id: childId, from_language: fromLanguage, to_language: language });
  }
}
```

All 4 existing language-switcher UIs (Phase BD's unified
`updateChildLanguage→setLanguage→app:languageChange→reload` path — AppShell
header dropdown, `/settings` ContentSettingsCard, homepage `LanguageBadges`,
`AppPreferencesCard`) automatically log switches with zero UI changes.

---

## 2. Reporting engine — `lib/adminAnalytics.ts` (new, pure functions)

Mirrors the `lib/parentInsights.ts` pattern (Phase BH): plain types + pure
aggregation functions, no Supabase calls, fully unit-testable. Re-uses
`ACTIVITIES`/`ActivityCategory` (`app/_activityData.ts`),
`CONTENT_STATUSES`/`ContentStatus` (`app/admin/missionMeta.ts`), `LANGUAGES`/
`Lang`/`getTrilingualStatus` (`app/_achievementData.ts`), and
`ChildAchievement`/`LevelMissionRow` (`lib/queries.ts`).

### Raw row shapes (consumed by `AnalyticsManager`'s bulk fetch)

```ts
export interface AdminChildRow { id: string; language: Lang; created_at: string }
export interface AdminProgressRow { child_id: string; language: Lang; category: ActivityCategory; mission_id: string; stars_earned: number; completed_at: string }
export interface AdminMissionVersionRow { mission_id: string; language: Lang; status: ContentStatus }
export interface AdminLanguageSwitchRow { child_id: string; from_language: Lang; to_language: Lang; switched_at: string }
```

`AdminProgressRow` has no direct DB equivalent — `child_progress` has no
`category` column, so `AnalyticsManager` derives it via the existing
`missions(category_slug)` join (same pattern as `getAllChildProgress`),
filtering out rows with a null `completed_at` or missing `category_slug`.

### 1. Learner Analytics — [lib/adminAnalytics.ts:68-90](../lib/adminAnalytics.ts#L68-L90)

```ts
export interface LearnerAnalytics { totalLearners: number; activeLearners: number; dailyActiveLearners: number; weeklyActiveLearners: number }
export function computeLearnerAnalytics(children: AdminChildRow[], progress: AdminProgressRow[], today?: Date): LearnerAnalytics
```

`totalLearners = children.length`. `activeLearners` = distinct `child_id`
with `>=1` progress row, ever. `dailyActiveLearners` = distinct `child_id`
with `completed_at` exactly `today` (via `daysSince === 0`).
`weeklyActiveLearners` = distinct `child_id` with `0 <= daysSince <= 6`
(today + previous 6 days).

### 2. Curriculum Analytics — [lib/adminAnalytics.ts:123-219](../lib/adminAnalytics.ts#L123-L219)

```ts
export interface LevelStat { level: number; reached: number; completed: number; completionRate: number }
export interface CategoryStat { category: ActivityCategory; learners: number; completionRate: number }
export interface DropOffStat { level: number; reached: number; completed: number; dropOffRate: number }
export interface CurriculumAnalytics {
  maxLevel: number; totalJourneys: number; levelStats: LevelStat[];
  categoryStats: CategoryStat[]; avgTimeToCompleteLevel1Days: number | null; dropOff: DropOffStat[]
}
export function computeCurriculumAnalytics(progress: AdminProgressRow[], levelMissions: LevelMissionRow[]): CurriculumAnalytics
```

Progress is grouped into **journeys** keyed by `(child_id, language)`. For
each journey, levels are walked in order 1..`maxLevel`:

- Level `N` is **reached** iff level `N-1` was completed (level 1 is always
  reached if the journey has `>=1` progress row).
- Level `N` is **completed** iff every `level_missions` row at that level
  has its `mission_id` in the journey's completed set. Because 7/8
  categories reuse Level-1's `mission_id` at Levels 2/3 (Phase BC's
  shared-placeholder design), this falls out of the lookup naturally — no
  special-casing needed.
- `levelStats[N].completionRate = completed/reached` (`0` if `reached===0`,
  never `NaN`).
- `categoryStats[cat]`: `learners` = journeys whose completed set contains
  that category's Level-1 `mission_id`; `completionRate = learners /
  totalJourneys` (`0` if no journeys).
- `avgTimeToCompleteLevel1Days` = average of `(max - min) completed_at`
  (in days) of the 8 Level-1-required missions, over journeys that
  completed Level 1. `null` if no journey has completed Level 1 yet.
- `dropOff[N] = { reached, completed, dropOffRate: reached>0 ? 1 -
  completed/reached : 0 }` — the same funnel data as `levelStats`, exposed
  separately because the UI renders it as a funnel (reached vs. completed
  bar) rather than a single rate.

### 3. Language Analytics — [lib/adminAnalytics.ts:244-276](../lib/adminAnalytics.ts#L244-L276)

```ts
export interface LanguageUsage { language: Lang; activeChildren: number; learners: number; completions: number }
export interface SwitchPair { from: Lang; to: Lang; count: number }
export interface LanguageAnalytics {
  usage: LanguageUsage[]; totalSwitches: number; childrenWhoSwitched: number;
  switchesPerActiveLearner: number; topSwitchPairs: SwitchPair[]
}
export function computeLanguageAnalytics(children: AdminChildRow[], progress: AdminProgressRow[], switches: AdminLanguageSwitchRow[]): LanguageAnalytics
```

`usage` has one row per `en`/`fr`/`rw`: `activeChildren` = children currently
set to that language, `learners`/`completions` = distinct child / row counts
from `progress` for that language. `switchesPerActiveLearner =
totalSwitches / activeLearners` (`activeLearners` = distinct child across
**all** progress; `0` if none). `topSwitchPairs` = `from->to` pairs sorted
by count desc, top 3.

### 4. Achievement Analytics — [lib/adminAnalytics.ts:301-322](../lib/adminAnalytics.ts#L301-L322)

```ts
export interface SlugCount { slug: string; count: number }
export interface AchievementAnalytics {
  certificatesEarned: number; certificatesBySlug: SlugCount[];
  badgesEarned: number; badgesBySlug: SlugCount[]; trilingualChampionCount: number
}
export function computeAchievementAnalytics(achievements: ChildAchievement[]): AchievementAnalytics
```

Splits `child_achievements` by `type`, groups each half by `slug` (sorted
desc by count) via a shared `groupBySlug` helper. `trilingualChampionCount`
groups achievements by `child_id` and runs the existing
`getTrilingualStatus()` (Phase BF, `app/_achievementData.ts`) per child —
**not re-derived**, so it stays in sync with the learner-facing Trilingual
Champion definition (`curriculum-complete-{en,fr,rw}` all present).

### 5. Content Analytics — [lib/adminAnalytics.ts:340-353](../lib/adminAnalytics.ts#L340-L353)

```ts
export type ContentStatusCounts = Record<ContentStatus, number> & { total: number }
export interface TranslationCoverage { language: Lang; published: number; totalMissions: number; pct: number }
export interface ContentAnalytics { statusCounts: ContentStatusCounts; translationCoverage: TranslationCoverage[] }
export function computeContentAnalytics(versions: AdminMissionVersionRow[]): ContentAnalytics
```

`statusCounts` tallies every `mission_versions` row by its `status`
(`draft`/`review`/`published`/`archived`, Phase BG migration 028) plus
`total`. `translationCoverage` is per-language: `totalMissions` = distinct
`mission_id` across **all** versions (any language/status — the curriculum's
total mission catalog); `published` = distinct `mission_id` with
`status==='published'` for that language; `pct = published/totalMissions *
100` (`0` if `totalMissions===0`).

---

## 3. Export utilities — `app/admin/exportUtils.ts` (new)

Small shared Blob/anchor-click helpers, extracted from
`BulkImportManager.tsx`'s existing CSV-template-download pattern plus the
`xlsx` package (already a dependency):

```ts
export function exportCSV(filename: string, rows: Record<string, unknown>[]): void   // via XLSX.utils.json_to_sheet + sheet_to_csv
export function exportXLSX(filename: string, sheets: { name: string; rows: Record<string, unknown>[] }[]): void // via XLSX.writeFile, one sheet per entry (name truncated to 31 chars — Excel's sheet-name limit)
```

---

## 4. Shared `StatCard` — `app/admin/StatCard.tsx` (new)

Extracted from `AnalyticsManager.tsx`'s pre-existing local `StatCard`
function into its own file so the 5 new tab components (which
`AnalyticsManager` imports) can reuse it without a circular import back
into `AnalyticsManager`:

```tsx
export default function StatCard({ icon: Icon, label, value, accentKey }: { icon: React.ElementType; label: string; value: string | number; accentKey: AccentKey })
```

---

## 5. UI — `AnalyticsManager.tsx` tab bar (CurriculumManager pattern)

Follows the exact `TABS`/`tab` pattern from `app/admin/CurriculumManager.tsx`:

```ts
const TABS = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'learners', label: 'Learners', icon: Users },
  { key: 'curriculum', label: 'Curriculum', icon: Layers },
  { key: 'languages', label: 'Languages', icon: Globe },
  { key: 'achievements', label: 'Achievements', icon: Award },
  { key: 'content', label: 'Content', icon: FileText },
] as const
type TabKey = typeof TABS[number]['key']
```

The original dashboard content becomes the `'overview'` tab (unchanged);
5 new tabs each render a dedicated component fed by `useMemo`-derived
`compute*` results:

| Tab | Component | Contents |
|---|---|---|
| Learners | [`LearnerAnalyticsTab.tsx`](../app/admin/LearnerAnalyticsTab.tsx) | 4 `StatCard`s (Total/Active/Daily/Weekly Active Learners) + explanatory footer. Export CSV: 4 metric rows. |
| Curriculum | [`CurriculumAnalyticsTab.tsx`](../app/admin/CurriculumAnalyticsTab.tsx) | 3 `StatCard`s (Levels, Journeys, Avg Days to Level 1) + per-level completion bars + per-category completion table + drop-off funnel (green=completed, red=drop-off). Export CSV: per-level completion + drop-off rates. |
| Languages | [`LanguageAnalyticsTab.tsx`](../app/admin/LanguageAnalyticsTab.tsx) | 3 language usage cards + 3 `StatCard`s (switch frequency) + "Top Language Switches" list. Export CSV: per-language usage. |
| Achievements | [`AchievementAnalyticsTab.tsx`](../app/admin/AchievementAnalyticsTab.tsx) | 3 `StatCard`s (Certificates, Badges, Trilingual Champions) + "Certificates by Type"/"Badges by Type" bar lists (capped at 12, "+N more (see CSV export)"). Export CSV: full uncapped slug lists. |
| Content | [`ContentAnalyticsTab.tsx`](../app/admin/ContentAnalyticsTab.tsx) | 4 `StatCard`s (one per `CONTENT_STATUSES`) + stacked content-pipeline bar/legend + per-language translation-coverage bars. Export CSV: translation coverage. |

### Bulk fetch — `AnalyticsManager.tsx:118-160`

`fetchData` now `Promise.all`s 6 queries (was 1): the existing
`child_progress` join (gained `mission_id` to the select), plus `children`,
`child_achievements`, `mission_versions`, `level_missions`,
`language_switch_log` — all already readable by admins under existing
`is_admin()` RLS policies (the new table's `"admin: full access"` policy
follows the same convention). Each error is checked individually and thrown
into the existing `loadError`/retry UI.

`AnalyticsManager.tsx:164-181` then derives:

```ts
const adminProgress = useMemo<AdminProgressRow[]>(() => rows
  .filter(r => r.completed_at && r.missions?.category_slug)
  .map(r => ({ child_id: r.child_id, language: r.language, category: r.missions!.category_slug as ActivityCategory,
                mission_id: r.mission_id, stars_earned: r.stars_earned, completed_at: r.completed_at as string })), [rows])

const learnerAnalytics     = useMemo(() => computeLearnerAnalytics(children, adminProgress), [children, adminProgress])
const curriculumAnalytics  = useMemo(() => computeCurriculumAnalytics(adminProgress, levelMissions), [adminProgress, levelMissions])
const languageAnalytics    = useMemo(() => computeLanguageAnalytics(children, adminProgress, languageSwitches), [children, adminProgress, languageSwitches])
const achievementAnalytics = useMemo(() => computeAchievementAnalytics(achievements), [achievements])
const contentAnalytics     = useMemo(() => computeContentAnalytics(missionVersions), [missionVersions])
```

### Header — tab bar + "Export Full Report (XLSX)"

A new tab-bar row was added to the existing indigo header
(`AnalyticsManager.tsx:373-394`), alongside a header-level
`handleExportFullReport` (`AnalyticsManager.tsx:183-212`) that bundles all
5 domains into a single `.xlsx` via `exportXLSX('nimipiko-analytics-report.xlsx', [...])`
with 9 sheets: Learners, Curriculum Levels, Curriculum Categories,
Languages, Language Switches, Certificates, Badges, Content Status,
Translation Coverage.

---

## 6. Regression safety

- No existing curriculum/achievement RPC (`complete_curriculum_mission`,
  `get_current_level`, `get_daily_missions`, etc.) was touched.
- The only schema change is the new, independent `language_switch_log`
  table (migration 031) — additive, RLS-protected, cascades on
  `children` delete.
- `updateChildLanguage`'s new insert is best-effort logging after the
  existing `children.language` update; it does not gate or change the
  update itself.
- `AnalyticsManager.tsx`'s pre-existing Overview tab content is unchanged,
  just wrapped in `{tab === 'overview' && (...)}`.

See the [verification report](./phase-bi-admin-analytics-verification.md)
for test results.
