// NIMIPIKO — Admin Analytics & Educator Insights reporting engine (Phase BI)
//
// Pure functions only — no Supabase calls. Consumes bulk, platform-wide raw
// rows fetched by app/admin/AnalyticsManager.tsx (admin RLS bypass) and
// derives every number the new analytics tabs render. Mirrors the
// lib/parentInsights.ts pattern (Phase BH), but platform-wide instead of
// per-child.

import { ACTIVITIES, type ActivityCategory } from "@/app/_activityData";
import { getTrilingualStatus, LANGUAGES, type Lang } from "@/app/_achievementData";
import { CONTENT_STATUSES, type ContentStatus } from "@/app/admin/missionMeta";
import type { ChildAchievement, LevelMissionRow } from "./queries";

export type { Lang };

// ── Date helpers ─────────────────────────────────────────────

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Whole days between an ISO timestamp/date and `today` (local), >=0 for past dates.
function daysSince(iso: string, today: Date): number {
  const from = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const start = new Date(`${toDateStr(today)}T00:00:00`);
  return Math.floor((start.getTime() - from.getTime()) / 86400000);
}

// ── Raw row shapes ───────────────────────────────────────────

export interface AdminChildRow {
  id: string;
  language: Lang;
  created_at: string;
}

export interface AdminProgressRow {
  child_id: string;
  language: Lang;
  category: ActivityCategory;
  mission_id: string;
  stars_earned: number;
  completed_at: string;
}

export interface AdminMissionVersionRow {
  mission_id: string;
  language: Lang;
  status: ContentStatus;
}

export interface AdminLanguageSwitchRow {
  child_id: string;
  from_language: Lang;
  to_language: Lang;
  switched_at: string;
}

// ── 1. Learner Analytics ────────────────────────────────────

export interface LearnerAnalytics {
  totalLearners: number;
  activeLearners: number;
  dailyActiveLearners: number;
  weeklyActiveLearners: number;
}

export function computeLearnerAnalytics(
  children: AdminChildRow[],
  progress: AdminProgressRow[],
  today: Date = new Date()
): LearnerAnalytics {
  const activeIds = new Set<string>();
  const dailyIds = new Set<string>();
  const weeklyIds = new Set<string>();

  for (const row of progress) {
    activeIds.add(row.child_id);
    const since = daysSince(row.completed_at, today);
    if (since === 0) dailyIds.add(row.child_id);
    if (since >= 0 && since <= 6) weeklyIds.add(row.child_id);
  }

  return {
    totalLearners: children.length,
    activeLearners: activeIds.size,
    dailyActiveLearners: dailyIds.size,
    weeklyActiveLearners: weeklyIds.size,
  };
}

// ── 2. Curriculum Analytics ──────────────────────────────────

export interface LevelStat {
  level: number;
  reached: number;
  completed: number;
  completionRate: number;
}

export interface CategoryStat {
  category: ActivityCategory;
  learners: number;
  completionRate: number;
}

export interface DropOffStat {
  level: number;
  reached: number;
  completed: number;
  dropOffRate: number;
}

export interface CurriculumAnalytics {
  maxLevel: number;
  totalJourneys: number;
  levelStats: LevelStat[];
  categoryStats: CategoryStat[];
  avgTimeToCompleteLevel1Days: number | null;
  dropOff: DropOffStat[];
}

export function computeCurriculumAnalytics(
  progress: AdminProgressRow[],
  levelMissions: LevelMissionRow[]
): CurriculumAnalytics {
  const maxLevel = levelMissions.reduce((max, row) => Math.max(max, row.level_number), 0);

  // level -> category -> mission_id required to "complete" that level/category slot
  const levelCategoryMission = new Map<number, Map<ActivityCategory, string>>();
  for (const row of levelMissions) {
    if (!levelCategoryMission.has(row.level_number)) levelCategoryMission.set(row.level_number, new Map());
    levelCategoryMission.get(row.level_number)!.set(row.category_slug, row.mission_id);
  }

  // Group progress by (child_id, language) "journey"
  interface Journey {
    completedMissions: Set<string>;
    completedAt: Map<string, string>; // mission_id -> completed_at
    categories: Set<ActivityCategory>;
  }
  const journeys = new Map<string, Journey>();
  for (const row of progress) {
    const key = `${row.child_id}::${row.language}`;
    if (!journeys.has(key)) journeys.set(key, { completedMissions: new Set(), completedAt: new Map(), categories: new Set() });
    const j = journeys.get(key)!;
    j.completedMissions.add(row.mission_id);
    j.completedAt.set(row.mission_id, row.completed_at);
    j.categories.add(row.category);
  }

  const totalJourneys = journeys.size;

  // Per-journey: which levels are completed (in order, stopping at the first incomplete level)
  const levelCompletedCounts = new Map<number, { reached: number; completed: number }>();
  for (let level = 1; level <= maxLevel; level++) levelCompletedCounts.set(level, { reached: 0, completed: 0 });

  const level1Durations: number[] = [];

  for (const journey of journeys.values()) {
    let reachedAll = true; // level N reached iff levels 1..N-1 all completed
    for (let level = 1; level <= maxLevel; level++) {
      const required = levelCategoryMission.get(level);
      if (!reachedAll || !required || required.size === 0) break;

      const counts = levelCompletedCounts.get(level)!;
      counts.reached++;

      let done = 0;
      for (const missionId of required.values()) {
        if (journey.completedMissions.has(missionId)) done++;
      }
      const completed = done === required.size;
      if (completed) counts.completed++;

      if (level === 1 && completed) {
        const timestamps = Array.from(required.values())
          .map(missionId => journey.completedAt.get(missionId))
          .filter((v): v is string => !!v)
          .map(v => new Date(v).getTime());
        if (timestamps.length > 0) {
          const days = (Math.max(...timestamps) - Math.min(...timestamps)) / 86400000;
          level1Durations.push(days);
        }
      }

      reachedAll = completed;
    }
  }

  const levelStats: LevelStat[] = [];
  for (let level = 1; level <= maxLevel; level++) {
    const { reached, completed } = levelCompletedCounts.get(level)!;
    levelStats.push({ level, reached, completed, completionRate: reached > 0 ? completed / reached : 0 });
  }

  const dropOff: DropOffStat[] = levelStats.map(s => ({
    level: s.level,
    reached: s.reached,
    completed: s.completed,
    dropOffRate: s.reached > 0 ? 1 - s.completed / s.reached : 0,
  }));

  const categoryStats: CategoryStat[] = ACTIVITIES.map(activity => {
    const level1Mission = levelCategoryMission.get(1)?.get(activity.category);
    let learners = 0;
    if (level1Mission) {
      for (const journey of journeys.values()) {
        if (journey.completedMissions.has(level1Mission)) learners++;
      }
    }
    return { category: activity.category, learners, completionRate: totalJourneys > 0 ? learners / totalJourneys : 0 };
  });

  const avgTimeToCompleteLevel1Days =
    level1Durations.length > 0 ? level1Durations.reduce((sum, d) => sum + d, 0) / level1Durations.length : null;

  return { maxLevel, totalJourneys, levelStats, categoryStats, avgTimeToCompleteLevel1Days, dropOff };
}

// ── 3. Language Analytics ────────────────────────────────────

export interface LanguageUsage {
  language: Lang;
  activeChildren: number;
  learners: number;
  completions: number;
}

export interface SwitchPair {
  from: Lang;
  to: Lang;
  count: number;
}

export interface LanguageAnalytics {
  usage: LanguageUsage[];
  totalSwitches: number;
  childrenWhoSwitched: number;
  switchesPerActiveLearner: number;
  topSwitchPairs: SwitchPair[];
}

export function computeLanguageAnalytics(
  children: AdminChildRow[],
  progress: AdminProgressRow[],
  switches: AdminLanguageSwitchRow[]
): LanguageAnalytics {
  const usage: LanguageUsage[] = LANGUAGES.map(language => {
    const rowsForLang = progress.filter(p => p.language === language);
    return {
      language,
      activeChildren: children.filter(c => c.language === language).length,
      learners: new Set(rowsForLang.map(p => p.child_id)).size,
      completions: rowsForLang.length,
    };
  });

  const totalSwitches = switches.length;
  const childrenWhoSwitched = new Set(switches.map(s => s.child_id)).size;
  const activeLearners = new Set(progress.map(p => p.child_id)).size;
  const switchesPerActiveLearner = activeLearners > 0 ? totalSwitches / activeLearners : 0;

  const pairCounts = new Map<string, SwitchPair>();
  for (const s of switches) {
    const key = `${s.from_language}->${s.to_language}`;
    const existing = pairCounts.get(key);
    if (existing) existing.count++;
    else pairCounts.set(key, { from: s.from_language, to: s.to_language, count: 1 });
  }
  const topSwitchPairs = Array.from(pairCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return { usage, totalSwitches, childrenWhoSwitched, switchesPerActiveLearner, topSwitchPairs };
}

// ── 4. Achievement Analytics ─────────────────────────────────

export interface SlugCount {
  slug: string;
  count: number;
}

export interface AchievementAnalytics {
  certificatesEarned: number;
  certificatesBySlug: SlugCount[];
  badgesEarned: number;
  badgesBySlug: SlugCount[];
  trilingualChampionCount: number;
}

function groupBySlug(rows: ChildAchievement[]): SlugCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.slug, (counts.get(row.slug) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count);
}

export function computeAchievementAnalytics(achievements: ChildAchievement[]): AchievementAnalytics {
  const certificates = achievements.filter(a => a.type === "certificate");
  const badges = achievements.filter(a => a.type === "badge");

  const byChild = new Map<string, ChildAchievement[]>();
  for (const a of achievements) {
    if (!byChild.has(a.child_id)) byChild.set(a.child_id, []);
    byChild.get(a.child_id)!.push(a);
  }
  let trilingualChampionCount = 0;
  for (const childAchievements of byChild.values()) {
    if (getTrilingualStatus(childAchievements).earned) trilingualChampionCount++;
  }

  return {
    certificatesEarned: certificates.length,
    certificatesBySlug: groupBySlug(certificates),
    badgesEarned: badges.length,
    badgesBySlug: groupBySlug(badges),
    trilingualChampionCount,
  };
}

// ── 5. Content Analytics ─────────────────────────────────────

export type ContentStatusCounts = Record<ContentStatus, number> & { total: number };

export interface TranslationCoverage {
  language: Lang;
  published: number;
  totalMissions: number;
  pct: number;
}

export interface ContentAnalytics {
  statusCounts: ContentStatusCounts;
  translationCoverage: TranslationCoverage[];
}

export function computeContentAnalytics(versions: AdminMissionVersionRow[]): ContentAnalytics {
  const statusCounts = { draft: 0, review: 0, published: 0, archived: 0, total: versions.length } as ContentStatusCounts;
  for (const v of versions) statusCounts[v.status]++;

  const totalMissions = new Set(versions.map(v => v.mission_id)).size;
  const translationCoverage: TranslationCoverage[] = LANGUAGES.map(language => {
    const published = new Set(
      versions.filter(v => v.language === language && v.status === "published").map(v => v.mission_id)
    ).size;
    return { language, published, totalMissions, pct: totalMissions > 0 ? (published / totalMissions) * 100 : 0 };
  });

  return { statusCounts, translationCoverage };
}

export { CONTENT_STATUSES };
