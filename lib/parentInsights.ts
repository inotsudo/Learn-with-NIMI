// NIMIPIKO — Parent Intelligence Dashboard aggregation (Phase BH)
//
// Pure functions only — no Supabase calls. Consumes the raw rows returned
// by lib/queries.ts's getLevelMissions/getAllChildProgress/getCurrentLevel/
// getChildAchievements plus the Phase BF achievement catalog helpers, and
// derives everything the /parents dashboard renders. Does not duplicate or
// re-derive get_current_level's "current level" logic — that always comes
// from the RPC (migration 026, unmodified).

import { ACTIVITIES, type ActivityCategory } from "@/app/_activityData";
import { LANGUAGES, type Lang } from "@/app/_achievementData";
import type { Child, ChildAchievement, LevelMissionRow, ProgressRow } from "./queries";

export type { Lang };

// ── Date helpers ─────────────────────────────────────────────

// Local "YYYY-MM-DD" — same convention as getActivityDates/getWeekStreak.
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Whole days between a "YYYY-MM-DD" or ISO timestamp and `today` (local).
function daysBetween(fromDateOrIso: string, today: Date): number {
  const from = new Date(`${fromDateOrIso.slice(0, 10)}T00:00:00`);
  const start = new Date(`${toDateStr(today)}T00:00:00`);
  return Math.floor((start.getTime() - from.getTime()) / 86400000);
}

// ── Streaks ──────────────────────────────────────────────────

export interface StreakInfo {
  /** Ongoing streak length: counts today if active, else counts back from yesterday. */
  current: number;
  activeToday: boolean;
  /** Longest run of consecutive days anywhere in the date set. */
  longest: number;
}

export function computeStreaks(activityDates: Set<string>, today: Date = new Date()): StreakInfo {
  const activeToday = activityDates.has(toDateStr(today));

  let current = 0;
  if (activityDates.size > 0) {
    const cursor = new Date(today);
    if (!activeToday) cursor.setDate(cursor.getDate() - 1);
    while (activityDates.has(toDateStr(cursor))) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  let longest = 0;
  if (activityDates.size > 0) {
    const sorted = Array.from(activityDates).sort();
    let run = 1;
    longest = 1;
    for (let i = 1; i < sorted.length; i++) {
      const diffDays = Math.round(
        (new Date(`${sorted[i]}T00:00:00`).getTime() - new Date(`${sorted[i - 1]}T00:00:00`).getTime()) / 86400000
      );
      run = diffDays === 1 ? run + 1 : 1;
      longest = Math.max(longest, run);
    }
  }

  return { current, activeToday, longest };
}

// ── Per-language journey (Requirement 2) ────────────────────

export interface LanguageJourney {
  language: Lang;
  currentLevel: number;
  levelProgress: { done: number; total: number };
  /** done / total slots across ALL levels (level_missions rows), 0-100. */
  completionPct: number;
  streak: number;
  lastActivityDate: string | null;
}

export function computeLanguageJourney(
  language: Lang,
  currentLevel: number,
  levelMissions: LevelMissionRow[],
  progressForLang: ProgressRow[],
  today: Date = new Date()
): LanguageJourney {
  const completedIds = new Set(progressForLang.map(r => r.mission_id));

  const levelSlots = levelMissions.filter(lm => lm.level_number === currentLevel);
  const done = levelSlots.filter(lm => completedIds.has(lm.mission_id)).length;
  const total = levelSlots.length;

  const doneAllSlots = levelMissions.filter(lm => completedIds.has(lm.mission_id)).length;
  const completionPct = levelMissions.length > 0 ? Math.round((doneAllSlots / levelMissions.length) * 100) : 0;

  const activityDates = new Set<string>();
  let lastActivityDate: string | null = null;
  for (const row of progressForLang) {
    const dateStr = toDateStr(new Date(row.completed_at));
    activityDates.add(dateStr);
    if (lastActivityDate === null || dateStr > lastActivityDate) lastActivityDate = dateStr;
  }

  return {
    language,
    currentLevel,
    levelProgress: { done, total },
    completionPct,
    streak: computeStreaks(activityDates, today).current,
    lastActivityDate,
  };
}

// ── Overview (Requirement 1) ─────────────────────────────────

export type OverallStatus = "complete" | "onTrack" | "justStarting";

export interface OverviewSummary {
  activeLanguage: Lang;
  status: OverallStatus;
  currentLevel: number;
  maxLevel: number;
  totalCertificates: number;
  totalBadges: number;
}

export function computeOverview(
  child: Pick<Child, "language">,
  achievements: ChildAchievement[],
  journeys: Record<Lang, LanguageJourney>,
  maxLevel: number
): OverviewSummary {
  const activeLanguage = child.language;
  const journey = journeys[activeLanguage];

  const totalCertificates = achievements.filter(a => a.type === "certificate").length;
  const totalBadges = achievements.filter(a => a.type === "badge").length;

  const hasCompleteCert = achievements.some(
    a => a.type === "certificate" && a.slug === `curriculum-complete-${activeLanguage}`
  );

  let status: OverallStatus;
  if (hasCompleteCert) {
    status = "complete";
  } else if (journey.completionPct === 0) {
    status = "justStarting";
  } else {
    status = "onTrack";
  }

  return {
    activeLanguage,
    status,
    currentLevel: journey.currentLevel,
    maxLevel,
    totalCertificates,
    totalBadges,
  };
}

// ── Progress timeline (Requirement 4) ────────────────────────

export type TimelineEventType = "levelComplete" | "categoryMaster" | "languageCert" | "languageStarted";

export interface TimelineEvent {
  type: TimelineEventType;
  language: Lang;
  earnedAt: string;
  level?: number;
  category?: ActivityCategory;
}

const LEVEL_COMPLETE_RE = /^level-(\d+)-complete-(en|fr|rw)$/;
const LANGUAGE_CERT_RE = /^curriculum-complete-(en|fr|rw)$/;
const CATEGORY_MASTER_RE = /^([a-z]+)-master-(en|fr|rw)$/;
const CATEGORY_SLUGS = new Set<string>(ACTIVITIES.map(a => a.category));

// Mirrors buildAchievementCatalog's scope: level-{N}-complete-{lang},
// {category}-master-{lang}, curriculum-complete-{lang}. program-complete-*
// is intentionally excluded (not part of that catalog either, avoiding
// duplicate-looking entries for the same level-completion moment).
export function buildProgressTimeline(achievements: ChildAchievement[], allProgress: ProgressRow[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const a of achievements) {
    let m: RegExpMatchArray | null;
    if ((m = a.slug.match(LEVEL_COMPLETE_RE))) {
      events.push({ type: "levelComplete", language: m[2] as Lang, earnedAt: a.earned_at, level: Number(m[1]) });
    } else if ((m = a.slug.match(LANGUAGE_CERT_RE))) {
      events.push({ type: "languageCert", language: m[1] as Lang, earnedAt: a.earned_at });
    } else if ((m = a.slug.match(CATEGORY_MASTER_RE)) && CATEGORY_SLUGS.has(m[1])) {
      events.push({ type: "categoryMaster", language: m[2] as Lang, earnedAt: a.earned_at, category: m[1] as ActivityCategory });
    }
  }

  const firstByLang: Partial<Record<Lang, string>> = {};
  for (const row of allProgress) {
    const existing = firstByLang[row.language];
    if (!existing || row.completed_at < existing) firstByLang[row.language] = row.completed_at;
  }
  for (const language of LANGUAGES) {
    const earnedAt = firstByLang[language];
    if (earnedAt) events.push({ type: "languageStarted", language, earnedAt });
  }

  return events.sort((a, b) => (a.earnedAt < b.earnedAt ? 1 : a.earnedAt > b.earnedAt ? -1 : 0));
}

// ── Learning insights (Requirement 5) ────────────────────────

export interface LearningInsights {
  strongestCategory: { category: ActivityCategory; completionPct: number } | null;
  mostActiveLanguage: Lang | null;
  longestStreak: number;
  recentTrend: "up" | "steady" | "down";
}

export function computeLearningInsights(
  levelMissions: LevelMissionRow[],
  allProgress: ProgressRow[],
  activeLanguage: Lang,
  today: Date = new Date()
): LearningInsights {
  const completedByLang: Record<Lang, Set<string>> = { en: new Set(), fr: new Set(), rw: new Set() };
  for (const row of allProgress) completedByLang[row.language].add(row.mission_id);

  let strongestCategory: { category: ActivityCategory; completionPct: number } | null = null;
  for (const activity of ACTIVITIES) {
    const slots = levelMissions.filter(lm => lm.category_slug === activity.category);
    const totalSlots = slots.length * LANGUAGES.length;
    if (totalSlots === 0) continue;
    let done = 0;
    for (const lang of LANGUAGES) done += slots.filter(s => completedByLang[lang].has(s.mission_id)).length;
    const completionPct = Math.round((done / totalSlots) * 100);
    if (!strongestCategory || completionPct > strongestCategory.completionPct) {
      strongestCategory = { category: activity.category, completionPct };
    }
  }

  const counts: Record<Lang, number> = { en: 0, fr: 0, rw: 0 };
  for (const row of allProgress) counts[row.language]++;
  const maxCount = Math.max(counts.en, counts.fr, counts.rw);
  let mostActiveLanguage: Lang | null = null;
  if (maxCount > 0) {
    const tied = LANGUAGES.filter(l => counts[l] === maxCount);
    mostActiveLanguage = tied.includes(activeLanguage) ? activeLanguage : tied[0];
  }

  const unionDates = new Set<string>();
  for (const row of allProgress) unionDates.add(toDateStr(new Date(row.completed_at)));
  const longestStreak = computeStreaks(unionDates, today).longest;

  const last7Start = new Date(today);
  last7Start.setDate(last7Start.getDate() - 7);
  const prev7Start = new Date(today);
  prev7Start.setDate(prev7Start.getDate() - 14);

  let last7 = 0;
  let prev7 = 0;
  for (const row of allProgress) {
    const d = new Date(row.completed_at);
    if (d >= last7Start && d <= today) last7++;
    else if (d >= prev7Start && d < last7Start) prev7++;
  }
  const recentTrend: "up" | "steady" | "down" = last7 > prev7 ? "up" : last7 < prev7 ? "down" : "steady";

  return { strongestCategory, mostActiveLanguage, longestStreak, recentTrend };
}

// ── Attention alerts (Requirement 6) ─────────────────────────

export type AlertType = "languageInactive" | "levelIncomplete" | "streakAtRisk";

export interface DashboardAlert {
  type: AlertType;
  language?: Lang;
  level?: number;
  daysSince?: number;
  currentStreak?: number;
}

// languageInactive: the journey has activity but lastActivityDate > 7 days ago.
// levelIncomplete: current level not yet complete and it's been >14 days since
//   the child arrived at this level (level-{N-1}-complete-{lang}.earned_at, or
//   children.created_at for level 1).
// streakAtRisk: a single overall alert — the combined (all-languages) streak
//   is still alive as of yesterday but nothing has been done today yet.
export function computeAttentionAlerts(
  child: Pick<Child, "created_at">,
  journeys: Record<Lang, LanguageJourney>,
  achievements: ChildAchievement[],
  allProgress: ProgressRow[],
  today: Date = new Date()
): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  for (const language of LANGUAGES) {
    const journey = journeys[language];

    if (journey.lastActivityDate) {
      const daysSince = daysBetween(journey.lastActivityDate, today);
      if (daysSince > 7) alerts.push({ type: "languageInactive", language, daysSince });
    }

    const { done, total } = journey.levelProgress;
    if (total > 0 && done < total) {
      const levelStartedAt =
        journey.currentLevel > 1
          ? achievements.find(a => a.type === "badge" && a.slug === `level-${journey.currentLevel - 1}-complete-${language}`)?.earned_at ?? null
          : child.created_at;

      if (levelStartedAt) {
        const daysSince = daysBetween(levelStartedAt, today);
        if (daysSince > 14) alerts.push({ type: "levelIncomplete", language, level: journey.currentLevel, daysSince });
      }
    }
  }

  const unionDates = new Set<string>();
  for (const row of allProgress) unionDates.add(toDateStr(new Date(row.completed_at)));
  const { current, activeToday } = computeStreaks(unionDates, today);
  if (current > 0 && !activeToday) alerts.push({ type: "streakAtRisk", currentStreak: current });

  return alerts;
}
