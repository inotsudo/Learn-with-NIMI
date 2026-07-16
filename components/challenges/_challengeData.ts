// Weekly period = this week's Monday date (YYYY-MM-DD)
export function getWeekPeriod(): string {
  const d = new Date();
  const dow = d.getDay(); // 0=Sun
  const diff = d.getDate() - dow + (dow === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

// Daily period = today (YYYY-MM-DD)
export function getDayPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Index into weekCounts/weekStreak for today (0=Mon, 6=Sun)
export function todayWeekIndex(): number {
  const dow = new Date().getDay();
  return dow === 0 ? 6 : dow - 1;
}

export interface Challenge {
  id: string;          // e.g. "streak3"
  period: "weekly" | "daily";
  emoji: string;
  titleKey: string;
  descKey: string;
  stars: number;
  bg: string;          // Tailwind gradient classes for the card accent
  /** Check whether this challenge is complete given the current stats */
  isComplete(stats: ChallengeStats): boolean;
  /** 0–1 progress value for the progress bar */
  progress(stats: ChallengeStats): number;
  /** Numeric progress label, e.g. "4/5" — card handles Done/Not-yet text */
  progressLabel(stats: ChallengeStats): string;
}

export interface ChallengeStats {
  currentStreak: number;
  weekActive: number;      // days with ≥1 activity this week (0–7)
  weekTotal: number;       // total activity completions this week
  weekMaxDay: number;      // max completions in a single day this week
  completedStories: number;
  todayCount: number;      // activity count today
}

export const WEEKLY_CHALLENGES: Challenge[] = [
  {
    id: "streak3",
    period: "weekly",
    emoji: "🔥",
    titleKey: "challengeStreak3Title",
    descKey: "challengeStreak3Desc",
    stars: 20,
    bg: "from-orange-400 to-red-500",
    isComplete: s => s.currentStreak >= 3,
    progress:   s => Math.min(s.currentStreak / 3, 1),
    progressLabel: s => `${Math.min(s.currentStreak, 3)}/3`,
  },
  {
    id: "active5",
    period: "weekly",
    emoji: "📅",
    titleKey: "challengeActive5Title",
    descKey: "challengeActive5Desc",
    stars: 35,
    bg: "from-blue-400 to-indigo-500",
    isComplete: s => s.weekActive >= 5,
    progress:   s => Math.min(s.weekActive / 5, 1),
    progressLabel: s => `${Math.min(s.weekActive, 5)}/5`,
  },
  {
    id: "stories3",
    period: "weekly",
    emoji: "📖",
    titleKey: "challengeStories3Title",
    descKey: "challengeStories3Desc",
    stars: 25,
    bg: "from-purple-400 to-violet-600",
    isComplete: s => s.completedStories >= 3,
    progress:   s => Math.min(s.completedStories / 3, 1),
    progressLabel: s => `${Math.min(s.completedStories, 3)}/3`,
  },
  {
    id: "multi2",
    period: "weekly",
    emoji: "⚡",
    titleKey: "challengeMulti2Title",
    descKey: "challengeMulti2Desc",
    stars: 20,
    bg: "from-yellow-400 to-amber-500",
    isComplete: s => s.weekMaxDay >= 2,
    progress:   s => Math.min(s.weekMaxDay / 2, 1),
    progressLabel: s => `${Math.min(s.weekMaxDay, 2)}/2`,
  },
  {
    id: "streak7",
    period: "weekly",
    emoji: "🏆",
    titleKey: "challengeStreak7Title",
    descKey: "challengeStreak7Desc",
    stars: 60,
    bg: "from-yellow-500 to-orange-500",
    isComplete: s => s.currentStreak >= 7,
    progress:   s => Math.min(s.currentStreak / 7, 1),
    progressLabel: s => `${Math.min(s.currentStreak, 7)}/7`,
  },
];

export const DAILY_CHALLENGES: Challenge[] = [
  {
    id: "any",
    period: "daily",
    emoji: "☀️",
    titleKey: "challengeAnyTitle",
    descKey: "challengeAnyDesc",
    stars: 10,
    bg: "from-emerald-400 to-teal-500",
    isComplete: s => s.todayCount >= 1,
    progress:   s => s.todayCount >= 1 ? 1 : 0,
    progressLabel: s => `${Math.min(s.todayCount, 1)}/1`,
  },
  {
    id: "double",
    period: "daily",
    emoji: "🌟",
    titleKey: "challengeDoubleTitle",
    descKey: "challengeDoubleDesc",
    stars: 20,
    bg: "from-pink-400 to-rose-500",
    isComplete: s => s.todayCount >= 2,
    progress:   s => Math.min(s.todayCount / 2, 1),
    progressLabel: s => `${Math.min(s.todayCount, 2)}/2`,
  },
];
