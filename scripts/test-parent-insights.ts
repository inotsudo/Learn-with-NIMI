// Phase BH — fixture-based unit tests for lib/parentInsights.ts's pure
// aggregation functions. No DB / network access. Run with:
//   npx tsx scripts/test-parent-insights.ts

import assert from "node:assert";
import {
  computeStreaks,
  computeLanguageJourney,
  computeOverview,
  buildProgressTimeline,
  computeLearningInsights,
  computeAttentionAlerts,
  type LanguageJourney,
  type Lang,
} from "../lib/parentInsights";
import { ACTIVITIES } from "../app/_activityData";
import type { LevelMissionRow, ProgressRow, ChildAchievement } from "../lib/queries";

const CATEGORIES = ACTIVITIES.map(a => a.category);

const TODAY = new Date(2026, 5, 14); // June 14, 2026 (local)

function dateStr(daysAgo: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoAt(daysAgo: number, hour = 10): string {
  return `${dateStr(daysAgo)}T${String(hour).padStart(2, "0")}:00:00Z`;
}

// 24 level_missions rows: 3 levels x 8 categories, distinct mission ids.
const LEVEL_MISSIONS: LevelMissionRow[] = [];
for (let level = 1; level <= 3; level++) {
  for (const category of CATEGORIES) {
    LEVEL_MISSIONS.push({ level_number: level, category_slug: category, mission_id: `${category}-L${level}` });
  }
}

function progressRow(mission_id: string, language: Lang, daysAgo: number): ProgressRow {
  const category = LEVEL_MISSIONS.find(lm => lm.mission_id === mission_id)!.category_slug;
  return { mission_id, language, category, stars_earned: 3, completed_at: isoAt(daysAgo) };
}

function makeJourney(overrides: Partial<LanguageJourney> & { language: Lang }): LanguageJourney {
  return {
    currentLevel: 1,
    levelProgress: { done: 0, total: 8 },
    completionPct: 0,
    streak: 0,
    lastActivityDate: null,
    ...overrides,
  };
}

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok - ${name}`);
}

// ================================================================
// 1. computeStreaks
// ================================================================
console.log("1. computeStreaks");

check("empty set -> all zero", () => {
  const result = computeStreaks(new Set(), TODAY);
  assert.deepStrictEqual(result, { current: 0, activeToday: false, longest: 0 });
});

check("active today only -> current 1, activeToday true", () => {
  const result = computeStreaks(new Set([dateStr(0)]), TODAY);
  assert.deepStrictEqual(result, { current: 1, activeToday: true, longest: 1 });
});

check("active yesterday only (not today) -> current counts back from yesterday", () => {
  const result = computeStreaks(new Set([dateStr(1)]), TODAY);
  assert.deepStrictEqual(result, { current: 1, activeToday: false, longest: 1 });
});

check("multi-day streak with a gap -> current vs longest differ", () => {
  const dates = new Set([dateStr(0), dateStr(1), dateStr(2), dateStr(10), dateStr(11), dateStr(12), dateStr(13)]);
  const result = computeStreaks(dates, TODAY);
  assert.deepStrictEqual(result, { current: 3, activeToday: true, longest: 4 });
});

// ================================================================
// 2. computeLanguageJourney
// ================================================================
console.log("2. computeLanguageJourney");

check("X/8 + completion% for a level-2 journey", () => {
  const progressForLang: ProgressRow[] = [
    ...CATEGORIES.map(c => progressRow(`${c}-L1`, "en", 5)), // all 8 Level-1 slots, 5 days ago
    progressRow("morning-L2", "en", 0),
    progressRow("movement-L2", "en", 0),
    progressRow("artistic-L2", "en", 0), // 3 of 8 Level-2 slots, today
  ];

  const journey = computeLanguageJourney("en", 2, LEVEL_MISSIONS, progressForLang, TODAY);

  assert.strictEqual(journey.language, "en");
  assert.strictEqual(journey.currentLevel, 2);
  assert.deepStrictEqual(journey.levelProgress, { done: 3, total: 8 });
  assert.strictEqual(journey.completionPct, Math.round((11 / 24) * 100)); // 46
  assert.strictEqual(journey.lastActivityDate, dateStr(0));
  assert.strictEqual(journey.streak, 1); // only "today" is consecutive; the 5-days-ago batch is isolated
});

// ================================================================
// 3. Language separation
// ================================================================
console.log("3. Language separation (no cross-language leakage)");

const sharedAllProgress: ProgressRow[] = [
  // en: full Level 1 (8/8) + 3/8 Level 2
  ...CATEGORIES.map(c => progressRow(`${c}-L1`, "en", 5)),
  progressRow("morning-L2", "en", 0),
  progressRow("movement-L2", "en", 0),
  progressRow("artistic-L2", "en", 0),
  // fr: 4/8 Level 1
  progressRow("morning-L1", "fr", 2),
  progressRow("movement-L1", "fr", 2),
  progressRow("artistic-L1", "fr", 2),
  progressRow("histoire-L1", "fr", 2),
  // rw: nothing
];

const sharedJourneys: Record<Lang, LanguageJourney> = {
  en: computeLanguageJourney("en", 2, LEVEL_MISSIONS, sharedAllProgress.filter(r => r.language === "en"), TODAY),
  fr: computeLanguageJourney("fr", 1, LEVEL_MISSIONS, sharedAllProgress.filter(r => r.language === "fr"), TODAY),
  rw: computeLanguageJourney("rw", 1, LEVEL_MISSIONS, sharedAllProgress.filter(r => r.language === "rw"), TODAY),
};

check("en journey reflects only en progress", () => {
  assert.deepStrictEqual(sharedJourneys.en.levelProgress, { done: 3, total: 8 });
  assert.strictEqual(sharedJourneys.en.completionPct, Math.round((11 / 24) * 100)); // 46
});

check("fr journey reflects only fr progress (no en/rw leakage)", () => {
  assert.deepStrictEqual(sharedJourneys.fr.levelProgress, { done: 4, total: 8 });
  assert.strictEqual(sharedJourneys.fr.completionPct, Math.round((4 / 24) * 100)); // 17
  assert.strictEqual(sharedJourneys.fr.lastActivityDate, dateStr(2));
});

check("rw journey is untouched (0 progress, no leakage)", () => {
  assert.deepStrictEqual(sharedJourneys.rw.levelProgress, { done: 0, total: 8 });
  assert.strictEqual(sharedJourneys.rw.completionPct, 0);
  assert.strictEqual(sharedJourneys.rw.lastActivityDate, null);
  assert.strictEqual(sharedJourneys.rw.streak, 0);
});

// ================================================================
// 4. computeOverview
// ================================================================
console.log("4. computeOverview");

check("onTrack: active language has partial progress, no completion cert", () => {
  const overview = computeOverview({ language: "en" }, [], sharedJourneys, 3);
  assert.strictEqual(overview.status, "onTrack");
  assert.strictEqual(overview.activeLanguage, "en");
  assert.strictEqual(overview.currentLevel, 2);
  assert.strictEqual(overview.maxLevel, 3);
  assert.strictEqual(overview.totalCertificates, 0);
  assert.strictEqual(overview.totalBadges, 0);
});

check("justStarting: active language has 0% completion", () => {
  const overview = computeOverview({ language: "rw" }, [], sharedJourneys, 3);
  assert.strictEqual(overview.status, "justStarting");
  assert.strictEqual(overview.currentLevel, 1);
});

check("complete: curriculum-complete-{lang} certificate earned", () => {
  const achievements: ChildAchievement[] = [
    { id: "1", child_id: "c", language: "en", type: "certificate", slug: "curriculum-complete-en", earned_at: isoAt(1) },
    { id: "2", child_id: "c", language: "en", type: "badge", slug: "level-1-complete-en", earned_at: isoAt(2) },
  ];
  const overview = computeOverview({ language: "en" }, achievements, sharedJourneys, 3);
  assert.strictEqual(overview.status, "complete");
  assert.strictEqual(overview.totalCertificates, 1);
  assert.strictEqual(overview.totalBadges, 1);
});

// ================================================================
// 5. buildProgressTimeline
// ================================================================
console.log("5. buildProgressTimeline");

check("correct event typing/sorting, program-complete-* excluded, languageStarted present", () => {
  const achievements: ChildAchievement[] = [
    { id: "1", child_id: "c", language: "en", type: "badge", slug: "level-1-complete-en", earned_at: isoAt(13) },
    { id: "2", child_id: "c", language: "en", type: "badge", slug: "artistic-master-en", earned_at: isoAt(12) },
    { id: "3", child_id: "c", language: "en", type: "certificate", slug: "curriculum-complete-en", earned_at: isoAt(4) },
    { id: "4", child_id: "c", language: "en", type: "certificate", slug: "program-complete-en", earned_at: isoAt(4, 9) },
  ];
  const allProgress: ProgressRow[] = [
    progressRow("morning-L1", "en", 30),
    progressRow("movement-L1", "en", 26),
    progressRow("morning-L1", "fr", 15),
  ];

  const events = buildProgressTimeline(achievements, allProgress);

  // program-complete-en excluded -> 3 achievement events + 2 languageStarted (en, fr) = 5
  assert.strictEqual(events.length, 5);

  assert.deepStrictEqual(events[0], { type: "languageCert", language: "en", earnedAt: isoAt(4) });
  assert.deepStrictEqual(events[1], { type: "categoryMaster", language: "en", earnedAt: isoAt(12), category: "artistic" });
  assert.deepStrictEqual(events[2], { type: "levelComplete", language: "en", earnedAt: isoAt(13), level: 1 });
  assert.deepStrictEqual(events[3], { type: "languageStarted", language: "fr", earnedAt: isoAt(15) });
  assert.deepStrictEqual(events[4], { type: "languageStarted", language: "en", earnedAt: isoAt(30) });

  // rw never appears (no progress rows)
  assert.ok(!events.some(e => e.language === "rw"));
});

// ================================================================
// 6. computeLearningInsights
// ================================================================
console.log("6. computeLearningInsights");

check("strongestCategory / mostActiveLanguage / longestStreak / 'up' trend", () => {
  const allProgress: ProgressRow[] = [
    progressRow("artistic-L1", "en", 3),
    progressRow("artistic-L2", "en", 2),
    progressRow("artistic-L3", "en", 1),
    progressRow("coloring-L1", "en", 0),
    progressRow("artistic-L1", "fr", 0),
  ];

  const insights = computeLearningInsights(LEVEL_MISSIONS, allProgress, "en", TODAY);

  // artistic: 4 done / (3 slots * 3 langs = 9) = 44%; coloring: 1/9 = 11%
  assert.deepStrictEqual(insights.strongestCategory, { category: "artistic", completionPct: 44 });
  assert.strictEqual(insights.mostActiveLanguage, "en"); // en has 4 rows vs fr's 1
  assert.strictEqual(insights.longestStreak, 4); // days-ago 0,1,2,3 are consecutive
  assert.strictEqual(insights.recentTrend, "up"); // 5 completions in last 7d, 0 in prior 7d
});

check("'down' trend: more completions in the prior 7d than the last 7d", () => {
  const allProgress: ProgressRow[] = [
    progressRow("morning-L1", "en", 1),
    progressRow("movement-L1", "en", 9),
    progressRow("artistic-L1", "en", 10),
    progressRow("histoire-L1", "en", 11),
  ];
  const insights = computeLearningInsights(LEVEL_MISSIONS, allProgress, "en", TODAY);
  assert.strictEqual(insights.recentTrend, "down"); // last7=1, prev7=3
});

check("'steady' trend: equal completions in both 7-day windows", () => {
  const allProgress: ProgressRow[] = [
    progressRow("morning-L1", "en", 1),
    progressRow("movement-L1", "en", 9),
  ];
  const insights = computeLearningInsights(LEVEL_MISSIONS, allProgress, "en", TODAY);
  assert.strictEqual(insights.recentTrend, "steady"); // last7=1, prev7=1
});

check("no level_missions / no progress -> nulls and zeros", () => {
  const insights = computeLearningInsights([], [], "en", TODAY);
  assert.strictEqual(insights.strongestCategory, null);
  assert.strictEqual(insights.mostActiveLanguage, null);
  assert.strictEqual(insights.longestStreak, 0);
  assert.strictEqual(insights.recentTrend, "steady");
});

// ================================================================
// 7. computeAttentionAlerts
// ================================================================
console.log("7. computeAttentionAlerts");

check("languageInactive: triggers at >7 days, not at exactly 7 or null", () => {
  const journeys: Record<Lang, LanguageJourney> = {
    en: makeJourney({ language: "en", lastActivityDate: dateStr(8), levelProgress: { done: 8, total: 8 } }),
    fr: makeJourney({ language: "fr", lastActivityDate: dateStr(7), levelProgress: { done: 8, total: 8 } }),
    rw: makeJourney({ language: "rw", lastActivityDate: null, levelProgress: { done: 8, total: 8 } }),
  };
  const alerts = computeAttentionAlerts({ created_at: isoAt(0) }, journeys, [], [], TODAY);
  assert.deepStrictEqual(alerts, [{ type: "languageInactive", language: "en", daysSince: 8 }]);
});

check("levelIncomplete: triggers at >14 days since level start, not at exactly 14", () => {
  const journeys: Record<Lang, LanguageJourney> = {
    en: makeJourney({ language: "en", lastActivityDate: dateStr(0), currentLevel: 2, levelProgress: { done: 5, total: 8 } }),
    fr: makeJourney({ language: "fr", lastActivityDate: dateStr(0), currentLevel: 1, levelProgress: { done: 3, total: 8 } }),
    rw: makeJourney({ language: "rw", lastActivityDate: dateStr(0), currentLevel: 1, levelProgress: { done: 8, total: 8 } }),
  };
  const achievements: ChildAchievement[] = [
    { id: "1", child_id: "c", language: "en", type: "badge", slug: "level-1-complete-en", earned_at: isoAt(20) },
  ];
  // child created 10 days ago: fr's level-1 start (created_at) is only 10 days ago -> no alert
  const alerts = computeAttentionAlerts({ created_at: isoAt(10) }, journeys, achievements, [], TODAY);
  assert.deepStrictEqual(alerts, [{ type: "levelIncomplete", language: "en", level: 2, daysSince: 20 }]);
});

check("streakAtRisk: triggers when an active streak didn't continue today", () => {
  const journeys: Record<Lang, LanguageJourney> = {
    en: makeJourney({ language: "en", lastActivityDate: dateStr(0), levelProgress: { done: 8, total: 8 } }),
    fr: makeJourney({ language: "fr", lastActivityDate: dateStr(0), levelProgress: { done: 8, total: 8 } }),
    rw: makeJourney({ language: "rw", lastActivityDate: dateStr(0), levelProgress: { done: 8, total: 8 } }),
  };
  const allProgress: ProgressRow[] = [
    progressRow("morning-L1", "en", 1),
    progressRow("movement-L1", "en", 2),
    progressRow("artistic-L1", "en", 3),
  ];
  const alerts = computeAttentionAlerts({ created_at: isoAt(0) }, journeys, [], allProgress, TODAY);
  assert.deepStrictEqual(alerts, [{ type: "streakAtRisk", currentStreak: 3 }]);
});

check("streakAtRisk: does NOT trigger when active today", () => {
  const journeys: Record<Lang, LanguageJourney> = {
    en: makeJourney({ language: "en", lastActivityDate: dateStr(0), levelProgress: { done: 8, total: 8 } }),
    fr: makeJourney({ language: "fr", lastActivityDate: dateStr(0), levelProgress: { done: 8, total: 8 } }),
    rw: makeJourney({ language: "rw", lastActivityDate: dateStr(0), levelProgress: { done: 8, total: 8 } }),
  };
  const allProgress: ProgressRow[] = [
    progressRow("morning-L1", "en", 0),
    progressRow("movement-L1", "en", 1),
    progressRow("artistic-L1", "en", 2),
    progressRow("histoire-L1", "en", 3),
  ];
  const alerts = computeAttentionAlerts({ created_at: isoAt(0) }, journeys, [], allProgress, TODAY);
  assert.deepStrictEqual(alerts, []);
});

console.log(`\nALL TESTS PASSED (${passed})`);
