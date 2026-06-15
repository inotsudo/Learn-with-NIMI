// Phase BI — fixture-based unit tests for lib/adminAnalytics.ts's pure
// aggregation functions. No DB / network access. Run with:
//   npx tsx scripts/test-admin-analytics.ts

import assert from "node:assert";
import {
  computeLearnerAnalytics,
  computeCurriculumAnalytics,
  computeLanguageAnalytics,
  computeAchievementAnalytics,
  computeContentAnalytics,
  type AdminChildRow,
  type AdminProgressRow,
  type AdminMissionVersionRow,
  type AdminLanguageSwitchRow,
  type Lang,
} from "../lib/adminAnalytics";
import { ACTIVITIES, type ActivityCategory } from "../app/_activityData";
import type { LevelMissionRow, ChildAchievement } from "../lib/queries";

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

function progressRow(
  child_id: string,
  language: Lang,
  category: ActivityCategory,
  mission_id: string,
  daysAgo: number
): AdminProgressRow {
  return { child_id, language, category, mission_id, stars_earned: 3, completed_at: isoAt(daysAgo) };
}

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok - ${name}`);
}

function closeTo(actual: number, expected: number, eps = 1e-9) {
  assert.ok(Math.abs(actual - expected) < eps, `expected ${actual} to be close to ${expected}`);
}

// ================================================================
// 1. computeLearnerAnalytics
// ================================================================
console.log("1. computeLearnerAnalytics");

check("zero-state -> all zero", () => {
  const result = computeLearnerAnalytics([], [], TODAY);
  assert.deepStrictEqual(result, { totalLearners: 0, activeLearners: 0, dailyActiveLearners: 0, weeklyActiveLearners: 0 });
});

check("totalLearners counts all children regardless of progress", () => {
  const children: AdminChildRow[] = [
    { id: "c1", language: "en", created_at: isoAt(30) },
    { id: "c2", language: "fr", created_at: isoAt(30) },
    { id: "c3", language: "rw", created_at: isoAt(30) },
  ];
  const result = computeLearnerAnalytics(children, [], TODAY);
  assert.strictEqual(result.totalLearners, 3);
  assert.strictEqual(result.activeLearners, 0);
});

check("active/daily/weekly buckets via completed_at recency", () => {
  const children: AdminChildRow[] = [
    { id: "c1", language: "en", created_at: isoAt(30) },
    { id: "c2", language: "en", created_at: isoAt(30) },
    { id: "c3", language: "en", created_at: isoAt(30) },
  ];
  const progress: AdminProgressRow[] = [
    progressRow("c1", "en", "morning", "morning-L1", 0), // today
    progressRow("c2", "en", "morning", "morning-L1", 5), // within last 7 days
    progressRow("c3", "en", "morning", "morning-L1", 10), // older than 7 days
  ];
  const result = computeLearnerAnalytics(children, progress, TODAY);
  assert.strictEqual(result.activeLearners, 3); // any progress ever
  assert.strictEqual(result.dailyActiveLearners, 1); // only c1
  assert.strictEqual(result.weeklyActiveLearners, 2); // c1 + c2
});

check("weekly boundary: since=6 included, since=7 excluded", () => {
  const children: AdminChildRow[] = [
    { id: "c5", language: "en", created_at: isoAt(30) },
    { id: "c6", language: "en", created_at: isoAt(30) },
  ];
  const progress: AdminProgressRow[] = [
    progressRow("c5", "en", "morning", "morning-L1", 6),
    progressRow("c6", "en", "morning", "morning-L1", 7),
  ];
  const result = computeLearnerAnalytics(children, progress, TODAY);
  assert.strictEqual(result.weeklyActiveLearners, 1); // only c5
});

// ================================================================
// 2. computeCurriculumAnalytics
// ================================================================
console.log("2. computeCurriculumAnalytics");

check("zero-state: no level_missions -> maxLevel 0, empty stats", () => {
  const result = computeCurriculumAnalytics([], []);
  assert.strictEqual(result.maxLevel, 0);
  assert.strictEqual(result.totalJourneys, 0);
  assert.deepStrictEqual(result.levelStats, []);
  assert.deepStrictEqual(result.dropOff, []);
  assert.strictEqual(result.avgTimeToCompleteLevel1Days, null);
  // every category has zero learners/completion when there are no journeys
  for (const stat of result.categoryStats) {
    assert.strictEqual(stat.learners, 0);
    assert.strictEqual(stat.completionRate, 0);
  }
  assert.strictEqual(result.categoryStats.length, CATEGORIES.length);
});

// 3 levels x 8 categories, all distinct mission ids
const LEVEL_MISSIONS_DISTINCT: LevelMissionRow[] = [];
for (let level = 1; level <= 3; level++) {
  for (const category of CATEGORIES) {
    LEVEL_MISSIONS_DISTINCT.push({ level_number: level, category_slug: category, mission_id: `${category}-L${level}` });
  }
}

check("level_missions present but zero progress -> reached/completed all 0", () => {
  const result = computeCurriculumAnalytics([], LEVEL_MISSIONS_DISTINCT);
  assert.strictEqual(result.maxLevel, 3);
  assert.strictEqual(result.totalJourneys, 0);
  assert.deepStrictEqual(result.levelStats, [
    { level: 1, reached: 0, completed: 0, completionRate: 0 },
    { level: 2, reached: 0, completed: 0, completionRate: 0 },
    { level: 3, reached: 0, completed: 0, completionRate: 0 },
  ]);
  // dropOffRate is 0 (not NaN/Infinity) when reached === 0
  assert.deepStrictEqual(result.dropOff, [
    { level: 1, reached: 0, completed: 0, dropOffRate: 0 },
    { level: 2, reached: 0, completed: 0, dropOffRate: 0 },
    { level: 3, reached: 0, completed: 0, dropOffRate: 0 },
  ]);
});

check("single journey, partial level 1 -> reached level 1, did not complete it", () => {
  // c1::en completes 5 of the 8 Level-1 missions
  const completedCats: ActivityCategory[] = ["morning", "movement", "artistic", "histoire", "zoom"];
  const progress: AdminProgressRow[] = completedCats.map(cat => progressRow("c1", "en", cat, `${cat}-L1`, 1));

  const result = computeCurriculumAnalytics(progress, LEVEL_MISSIONS_DISTINCT);
  assert.strictEqual(result.totalJourneys, 1);
  assert.deepStrictEqual(result.levelStats[0], { level: 1, reached: 1, completed: 0, completionRate: 0 });
  // levels 2/3 not reached because level 1 isn't complete
  assert.deepStrictEqual(result.levelStats[1], { level: 2, reached: 0, completed: 0, completionRate: 0 });
  assert.deepStrictEqual(result.levelStats[2], { level: 3, reached: 0, completed: 0, completionRate: 0 });
  // drop-off at level 1 is 100% (reached but not completed)
  assert.strictEqual(result.dropOff[0].dropOffRate, 1);
  // not completed -> no level-1 duration sample
  assert.strictEqual(result.avgTimeToCompleteLevel1Days, null);

  // categoryStats: the 5 completed categories show 1 learner / 1 journey = 100%
  for (const stat of result.categoryStats) {
    if (completedCats.includes(stat.category)) {
      assert.strictEqual(stat.learners, 1);
      assert.strictEqual(stat.completionRate, 1);
    } else {
      assert.strictEqual(stat.learners, 0);
      assert.strictEqual(stat.completionRate, 0);
    }
  }
});

// Mirrors the real curriculum (Phase BC): 7/8 categories reuse Level-1's
// mission_id at Levels 2/3 (evergreen content); "morning" (the rotating
// pool, Phase AA) has a distinct mission per level.
const LEVEL_MISSIONS_SHARED: LevelMissionRow[] = [];
for (const category of CATEGORIES) {
  for (let level = 1; level <= 3; level++) {
    const mission_id = category === "morning" ? `morning-L${level}` : `${category}-L1`;
    LEVEL_MISSIONS_SHARED.push({ level_number: level, category_slug: category, mission_id });
  }
}

check("multi-journey with shared Level-2/3 placeholders -> per-level funnel + avg Level-1 duration", () => {
  // J1 (c1::en): completes all 8 Level-1 missions (spread over a week),
  // never touches morning-L2/L3 -> reaches Level 2 but doesn't complete it.
  const j1DaysAgo = [10, 9, 8, 7, 6, 5, 4, 3]; // max-min = 7 days
  const j1Progress: AdminProgressRow[] = CATEGORIES.map((cat, i) => {
    const mission_id = cat === "morning" ? "morning-L1" : `${cat}-L1`;
    return progressRow("c1", "en", cat, mission_id, j1DaysAgo[i]);
  });

  // J2 (c2::en): completes all 8 Level-1 missions on the same day (duration
  // = 0), plus morning-L2 and morning-L3 -> via the shared placeholders this
  // also completes Levels 2 AND 3.
  const j2Level1: AdminProgressRow[] = CATEGORIES.map(cat => {
    const mission_id = cat === "morning" ? "morning-L1" : `${cat}-L1`;
    return progressRow("c2", "en", cat, mission_id, 5);
  });
  const j2Extra: AdminProgressRow[] = [
    progressRow("c2", "en", "morning", "morning-L2", 0),
    progressRow("c2", "en", "morning", "morning-L3", 0),
  ];

  // J3 (c3::fr): only has a progress row for morning-L2 (skipped Level 1
  // entirely) -> reaches Level 1 (every journey with >=1 row does) but
  // doesn't complete it, and never reaches Level 2/3.
  const j3Progress: AdminProgressRow[] = [progressRow("c3", "fr", "morning", "morning-L2", 0)];

  const allProgress = [...j1Progress, ...j2Level1, ...j2Extra, ...j3Progress];
  const result = computeCurriculumAnalytics(allProgress, LEVEL_MISSIONS_SHARED);

  assert.strictEqual(result.maxLevel, 3);
  assert.strictEqual(result.totalJourneys, 3);

  // Level 1: reached by all 3 journeys, completed by J1 + J2
  assert.deepStrictEqual(
    { reached: result.levelStats[0].reached, completed: result.levelStats[0].completed },
    { reached: 3, completed: 2 }
  );
  closeTo(result.levelStats[0].completionRate, 2 / 3);

  // Level 2: reached by J1 + J2 (both completed Level 1), completed by J2 only
  assert.deepStrictEqual(
    { reached: result.levelStats[1].reached, completed: result.levelStats[1].completed },
    { reached: 2, completed: 1 }
  );
  closeTo(result.levelStats[1].completionRate, 1 / 2);

  // Level 3: reached by J2 only (completed Level 2), and J2 completes it too
  assert.deepStrictEqual(
    { reached: result.levelStats[2].reached, completed: result.levelStats[2].completed },
    { reached: 1, completed: 1 }
  );
  closeTo(result.levelStats[2].completionRate, 1);

  // Drop-off funnel mirrors the level stats
  closeTo(result.dropOff[0].dropOffRate, 1 - 2 / 3);
  closeTo(result.dropOff[1].dropOffRate, 1 - 1 / 2);
  closeTo(result.dropOff[2].dropOffRate, 0);

  // Every category: J1 + J2 completed its Level-1 mission, J3 did not
  for (const stat of result.categoryStats) {
    assert.strictEqual(stat.learners, 2, `category ${stat.category} should have 2 learners`);
    closeTo(stat.completionRate, 2 / 3);
  }

  // avg Level-1 duration across J1 (7 days) and J2 (0 days)
  assert.ok(result.avgTimeToCompleteLevel1Days !== null);
  closeTo(result.avgTimeToCompleteLevel1Days!, (7 + 0) / 2);
});

// ================================================================
// 3. computeLanguageAnalytics
// ================================================================
console.log("3. computeLanguageAnalytics");

check("zero-state -> usage rows for all 3 languages, all zero", () => {
  const result = computeLanguageAnalytics([], [], []);
  assert.deepStrictEqual(result.usage, [
    { language: "en", activeChildren: 0, learners: 0, completions: 0 },
    { language: "fr", activeChildren: 0, learners: 0, completions: 0 },
    { language: "rw", activeChildren: 0, learners: 0, completions: 0 },
  ]);
  assert.strictEqual(result.totalSwitches, 0);
  assert.strictEqual(result.childrenWhoSwitched, 0);
  assert.strictEqual(result.switchesPerActiveLearner, 0);
  assert.deepStrictEqual(result.topSwitchPairs, []);
});

check("usage: activeChildren from children.language, learners/completions from progress", () => {
  const children: AdminChildRow[] = [
    { id: "c1", language: "en", created_at: isoAt(30) },
    { id: "c2", language: "en", created_at: isoAt(30) },
    { id: "c3", language: "fr", created_at: isoAt(30) },
    { id: "c4", language: "rw", created_at: isoAt(30) },
  ];
  const progress: AdminProgressRow[] = [
    progressRow("c1", "en", "morning", "morning-L1", 0),
    progressRow("c1", "en", "movement", "movement-L1", 0),
    progressRow("c2", "en", "morning", "morning-L1", 0),
    progressRow("c3", "fr", "morning", "morning-L1", 0),
    progressRow("c3", "fr", "movement", "movement-L1", 0),
    progressRow("c3", "fr", "artistic", "artistic-L1", 0),
  ];
  const result = computeLanguageAnalytics(children, progress, []);
  const byLang = Object.fromEntries(result.usage.map(u => [u.language, u]));
  assert.deepStrictEqual(byLang.en, { language: "en", activeChildren: 2, learners: 2, completions: 3 });
  assert.deepStrictEqual(byLang.fr, { language: "fr", activeChildren: 1, learners: 1, completions: 3 });
  assert.deepStrictEqual(byLang.rw, { language: "rw", activeChildren: 1, learners: 0, completions: 0 });
});

check("switch frequency + topSwitchPairs sorted desc, capped at 3", () => {
  const progress: AdminProgressRow[] = [
    progressRow("c1", "en", "morning", "morning-L1", 0),
    progressRow("c2", "en", "morning", "morning-L1", 0),
    progressRow("c3", "en", "morning", "morning-L1", 0),
  ];
  const switches: AdminLanguageSwitchRow[] = [
    { child_id: "c1", from_language: "en", to_language: "fr", switched_at: isoAt(3) },
    { child_id: "c1", from_language: "en", to_language: "fr", switched_at: isoAt(2) },
    { child_id: "c1", from_language: "en", to_language: "fr", switched_at: isoAt(1) },
    { child_id: "c1", from_language: "fr", to_language: "rw", switched_at: isoAt(0) },
    { child_id: "c2", from_language: "en", to_language: "rw", switched_at: isoAt(0) },
    { child_id: "c2", from_language: "en", to_language: "rw", switched_at: isoAt(1) },
    { child_id: "c2", from_language: "rw", to_language: "fr", switched_at: isoAt(0) },
    { child_id: "c2", from_language: "fr", to_language: "en", switched_at: isoAt(0) },
  ];
  const result = computeLanguageAnalytics([], progress, switches);
  assert.strictEqual(result.totalSwitches, 8);
  assert.strictEqual(result.childrenWhoSwitched, 2); // c1, c2
  closeTo(result.switchesPerActiveLearner, 8 / 3); // 3 active learners (c1,c2,c3)

  // top 3 of 4 distinct pairs, sorted by count desc: en->fr(3), en->rw(2), then 2 ties at 1
  assert.strictEqual(result.topSwitchPairs.length, 3);
  assert.deepStrictEqual(result.topSwitchPairs[0], { from: "en", to: "fr", count: 3 });
  assert.deepStrictEqual(result.topSwitchPairs[1], { from: "en", to: "rw", count: 2 });
  assert.strictEqual(result.topSwitchPairs[2].count, 1);
});

check("switchesPerActiveLearner is 0 when there are no active learners", () => {
  const switches: AdminLanguageSwitchRow[] = [
    { child_id: "c1", from_language: "en", to_language: "fr", switched_at: isoAt(0) },
  ];
  const result = computeLanguageAnalytics([], [], switches);
  assert.strictEqual(result.switchesPerActiveLearner, 0);
});

// ================================================================
// 4. computeAchievementAnalytics
// ================================================================
console.log("4. computeAchievementAnalytics");

function achievement(child_id: string, language: Lang, type: "badge" | "certificate", slug: string, daysAgo = 0): ChildAchievement {
  return { id: `${child_id}-${slug}`, child_id, language, type, slug, earned_at: isoAt(daysAgo) };
}

check("zero-state -> all zero, empty slug lists", () => {
  const result = computeAchievementAnalytics([]);
  assert.deepStrictEqual(result, {
    certificatesEarned: 0,
    certificatesBySlug: [],
    badgesEarned: 0,
    badgesBySlug: [],
    trilingualChampionCount: 0,
  });
});

check("certificates/badges grouped by slug and sorted by count desc", () => {
  const rows: ChildAchievement[] = [
    achievement("c1", "en", "badge", "explorer-morning"),
    achievement("c2", "en", "badge", "explorer-morning"),
    achievement("c3", "en", "badge", "explorer-morning"),
    achievement("c1", "en", "badge", "explorer-movement"),
    achievement("c2", "en", "badge", "explorer-movement"),
    achievement("c1", "en", "badge", "category-master-morning"),
    achievement("c1", "en", "certificate", "language-explorer-en"),
    achievement("c2", "en", "certificate", "language-explorer-en"),
    achievement("c1", "fr", "certificate", "curriculum-complete-fr"),
  ];
  const result = computeAchievementAnalytics(rows);
  assert.strictEqual(result.badgesEarned, 6);
  assert.deepStrictEqual(result.badgesBySlug, [
    { slug: "explorer-morning", count: 3 },
    { slug: "explorer-movement", count: 2 },
    { slug: "category-master-morning", count: 1 },
  ]);
  assert.strictEqual(result.certificatesEarned, 3);
  assert.deepStrictEqual(result.certificatesBySlug, [
    { slug: "language-explorer-en", count: 2 },
    { slug: "curriculum-complete-fr", count: 1 },
  ]);
});

check("trilingualChampionCount: only children with all 3 curriculum-complete certs", () => {
  const rows: ChildAchievement[] = [
    // c1: full trilingual champion
    achievement("c1", "en", "certificate", "curriculum-complete-en", 30),
    achievement("c1", "fr", "certificate", "curriculum-complete-fr", 20),
    achievement("c1", "rw", "certificate", "curriculum-complete-rw", 10),
    // c2: only 2 of 3 languages -> not a champion
    achievement("c2", "en", "certificate", "curriculum-complete-en"),
    achievement("c2", "fr", "certificate", "curriculum-complete-fr"),
    // c3: unrelated badges only
    achievement("c3", "en", "badge", "explorer-morning"),
  ];
  const result = computeAchievementAnalytics(rows);
  assert.strictEqual(result.trilingualChampionCount, 1);
});

// ================================================================
// 5. computeContentAnalytics
// ================================================================
console.log("5. computeContentAnalytics");

check("zero-state -> all-zero status counts, empty-but-shaped translation coverage", () => {
  const result = computeContentAnalytics([]);
  assert.deepStrictEqual(result.statusCounts, { draft: 0, review: 0, published: 0, archived: 0, total: 0 });
  assert.deepStrictEqual(result.translationCoverage, [
    { language: "en", published: 0, totalMissions: 0, pct: 0 },
    { language: "fr", published: 0, totalMissions: 0, pct: 0 },
    { language: "rw", published: 0, totalMissions: 0, pct: 0 },
  ]);
});

check("status pipeline counts + per-language translation coverage percentages", () => {
  const versions: AdminMissionVersionRow[] = [
    // m1: published in en + fr
    { mission_id: "m1", language: "en", status: "published" },
    { mission_id: "m1", language: "fr", status: "published" },
    // m2: published in en, draft in fr
    { mission_id: "m2", language: "en", status: "published" },
    { mission_id: "m2", language: "fr", status: "draft" },
    // m3: draft in en only
    { mission_id: "m3", language: "en", status: "draft" },
    // m4: review in en, archived in rw (totalMissions still counts m4 once)
    { mission_id: "m4", language: "en", status: "review" },
    { mission_id: "m4", language: "rw", status: "archived" },
  ];
  const result = computeContentAnalytics(versions);

  assert.strictEqual(result.statusCounts.total, 7);
  assert.deepStrictEqual(result.statusCounts, { draft: 2, review: 1, published: 3, archived: 1, total: 7 });

  const byLang = Object.fromEntries(result.translationCoverage.map(c => [c.language, c]));
  // 4 distinct missions overall
  assert.strictEqual(byLang.en.totalMissions, 4);
  assert.strictEqual(byLang.fr.totalMissions, 4);
  assert.strictEqual(byLang.rw.totalMissions, 4);

  // en: m1, m2 published -> 2/4 = 50%
  assert.strictEqual(byLang.en.published, 2);
  closeTo(byLang.en.pct, 50);

  // fr: only m1 published -> 1/4 = 25%
  assert.strictEqual(byLang.fr.published, 1);
  closeTo(byLang.fr.pct, 25);

  // rw: m4 is archived, not published -> 0/4 = 0%
  assert.strictEqual(byLang.rw.published, 0);
  closeTo(byLang.rw.pct, 0);
});

console.log(`\nALL TESTS PASSED (${passed})`);
