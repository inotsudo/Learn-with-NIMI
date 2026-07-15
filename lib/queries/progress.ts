import supabase from "@/lib/supabaseClient";
import { qcached, qinvalidate, lscached, lsinvalidate, TTL_SHORT } from "@/lib/queryCache";
import { computeStreaks } from "@/lib/parentInsights";
import { getUsedShieldDates } from "./shop";
import type { ProgressRow } from "./types";

// ─── Shared base query ───────────────────────────────────────────────────────
// getWeekStreak, getActivityDates, getTotalStars, and getWeekActivityCounts all
// scan the same child_progress table with the same filters. Instead of 4
// separate round-trips, one cached fetch powers all four.
type BaseRow = { mission_id: string; completed_at: string; missions: { stars: number } | null };

function rawProgressRows(childId: string, language: "en" | "fr" | "rw"): Promise<BaseRow[]> {
  return lscached(`progressRows:${childId}:${language}`, TTL_SHORT, async () => {
    const { data } = await supabase
      .from("child_progress")
      .select("mission_id, completed_at, missions(stars)")
      .eq("child_id", childId)
      .eq("language", language);
    return (data ?? []) as unknown as BaseRow[];
  });
}

// challenge_bonus_stars is a separate table — cache it independently so
// getTotalStars doesn't re-fetch it on every call.
function bonusStarsTotal(childId: string, language: "en" | "fr" | "rw"): Promise<number> {
  return lscached(`bonusStars:${childId}:${language}`, TTL_SHORT, async () => {
    const { data } = await supabase
      .from("challenge_bonus_stars")
      .select("stars")
      .eq("child_id", childId)
      .eq("language", language);
    return (data ?? []).reduce((sum: number, r: { stars: number }) => sum + r.stars, 0);
  });
}

function weekMonday(): Date {
  const now = new Date();
  const m = new Date(now);
  m.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  m.setHours(0, 0, 0, 0);
  return m;
}
// ─────────────────────────────────────────────────────────────────────────────

// Sum of `stars` for missions completed today (in the given language's
// journey). 0 if no progress yet.
export async function getTodayStars(childId: string, language: "en" | "fr" | "rw"): Promise<number> {
  const rows = await rawProgressRows(childId, language);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return rows
    .filter(r => new Date(r.completed_at) >= startOfDay)
    .reduce((sum, r) => sum + (r.missions?.stars ?? 10), 0);
}

// Which of the last 7 days (Mon–Sun, current week) had >=1 completion.
// Index 0 = Monday. All-false if no progress yet.
export function getWeekStreak(childId: string, language: "en" | "fr" | "rw"): Promise<boolean[]> {
  return qcached(`weekStreak:${childId}:${language}`, async () => {
    const rows   = await rawProgressRows(childId, language);
    const monday = weekMonday();
    const result = [false, false, false, false, false, false, false];
    for (const row of rows) {
      const diffDays = Math.floor((new Date(row.completed_at).getTime() - monday.getTime()) / 86400000);
      if (diffDays >= 0 && diffDays < 7) result[diffDays] = true;
    }
    return result;
  });
}

// Sum of `stars` across ALL completed missions (all-time) plus challenge bonus stars.
export function getTotalStars(childId: string, language: "en" | "fr" | "rw"): Promise<number> {
  return qcached(`totalStars:${childId}:${language}`, async () => {
    const [rows, bonus] = await Promise.all([
      rawProgressRows(childId, language),
      bonusStarsTotal(childId, language),
    ]);
    return rows.reduce((sum, r) => sum + (r.missions?.stars ?? 10), 0) + bonus;
  });
}

// All-time set of "YYYY-MM-DD" (local-date) strings with >=1 completion.
export function getActivityDates(childId: string, language: "en" | "fr" | "rw"): Promise<Set<string>> {
  return qcached(`activityDates:${childId}:${language}`, async () => {
    const rows = await rawProgressRows(childId, language);
    const dates = new Set<string>();
    for (const row of rows) {
      const d = new Date(row.completed_at);
      dates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    return dates;
  });
}

// Number of completions per day (Mon–Sun, current week). Index 0 = Monday.
export function getWeekActivityCounts(childId: string, language: "en" | "fr" | "rw"): Promise<number[]> {
  return qcached(`weekCounts:${childId}:${language}`, async () => {
    const rows   = await rawProgressRows(childId, language);
    const monday = weekMonday();
    const result = [0, 0, 0, 0, 0, 0, 0];
    for (const row of rows) {
      const diffDays = Math.floor((new Date(row.completed_at).getTime() - monday.getTime()) / 86400000);
      if (diffDays >= 0 && diffDays < 7) result[diffDays]++;
    }
    return result;
  });
}

// All child_progress rows for this child, across ALL 3 language journeys.
// Source data for the Parent Intelligence Dashboard's per-language journey
// cards, learning insights and attention alerts.
export async function getAllChildProgress(childId: string): Promise<ProgressRow[]> {
  const { data, error } = await supabase
    .from("child_progress")
    .select("mission_id, language, stars_earned, completed_at, missions(category_slug)")
    .eq("child_id", childId);
  if (error) {
    console.error("[getAllChildProgress]", error.message);
    return [];
  }
  return (data ?? []).map((row: any) => ({
    mission_id: row.mission_id,
    language: row.language,
    category: row.missions?.category_slug,
    stars_earned: row.stars_earned,
    completed_at: row.completed_at,
  })) as ProgressRow[];
}

// The child's current curriculum level for a specific language journey
// (RPC unchanged since migration 026 — authoritative, saturates at maxLevel).
export function getCurrentLevel(childId: string, language: "en" | "fr" | "rw"): Promise<number> {
  return qcached(`currentLevel:${childId}:${language}`, async () => {
    const { data, error } = await supabase.rpc("get_current_level", {
      p_child_id: childId,
      p_language: language,
    });
    if (error) {
      console.error("[getCurrentLevel]", error.message);
      return 1;
    }
    return (data ?? 1) as number;
  });
}

// Shield-aware consecutive day streak — result cached so parallel callers
// (home page + AppShell + stories) share one computation.
export function getConsecutiveStreak(childId: string, language: "en" | "fr" | "rw"): Promise<number> {
  return qcached(`consecutiveStreak:${childId}:${language}`, async () => {
    const [dates, shieldedDates] = await Promise.all([
      getActivityDates(childId, language),
      getUsedShieldDates(childId, language),
    ]);
    return computeStreaks(dates, new Date(), shieldedDates).current;
  });
}

// Count of fully-completed stories for this child+language.
// A story is "complete" when every one of its story_slots has a matching
// child_progress row. Reuses the cached rawProgressRows scan + one small
// story_slots fetch (cached separately, table rarely changes).
export function getCompletedStoriesCount(childId: string, language: "en" | "fr" | "rw"): Promise<number> {
  return qcached(`completedStoriesCount:${childId}:${language}`, async () => {
    const [rows, { data: slots }] = await Promise.all([
      rawProgressRows(childId, language),
      supabase.from("story_slots").select("story_id, mission_id"),
    ]);
    if (!slots?.length) return 0;
    const done = new Set(rows.map(r => r.mission_id));
    const byStory: Record<string, string[]> = {};
    for (const s of slots as { story_id: string; mission_id: string }[]) {
      (byStory[s.story_id] ??= []).push(s.mission_id);
    }
    return Object.values(byStory).filter(
      ids => ids.length > 0 && ids.every(id => done.has(id))
    ).length;
  });
}

// Per-story star totals derived from child_progress, used by the stories page
// to render the star count on each story card without a raw DB query in the page.
export function getStoryProgressStars(childId: string, language: "en" | "fr" | "rw"): Promise<Record<string, number>> {
  return qcached(`storyProgressStars:${childId}:${language}`, async () => {
    const { data } = await supabase
      .from("child_progress")
      .select("mission_id, missions(stars, story_slots(story_id))")
      .eq("child_id", childId)
      .eq("language", language);
    const perStory: Record<string, number> = {};
    for (const row of data ?? []) {
      const m = (row as any).missions as { stars?: number; story_slots?: { story_id?: string } | { story_id?: string }[] } | null;
      const storyId = Array.isArray(m?.story_slots) ? m.story_slots[0]?.story_id : m?.story_slots?.story_id;
      if (storyId) perStory[storyId] = (perStory[storyId] ?? 0) + (m?.stars ?? 0);
    }
    return perStory;
  });
}

// Daily claim helpers — stored as a badge slug 'daily-claim-YYYY-MM-DD'.
// No migration needed; uses the existing child_achievements table.
function todayClaimSlug(): string {
  const d = new Date();
  return `daily-claim-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function hasDailyClaimedToday(childId: string, language: "en" | "fr" | "rw"): Promise<boolean> {
  const dateStr = todayClaimSlug().replace("daily-claim-", "");
  return qcached(`dailyClaimed:${childId}:${language}:${dateStr}`, async () => {
    const { data } = await supabase
      .from("child_achievements")
      .select("id")
      .eq("child_id", childId)
      .eq("language", language)
      .eq("type", "badge")
      .eq("slug", `daily-claim-${dateStr}`)
      .maybeSingle();
    return data !== null;
  });
}

export async function claimDailyBonus(childId: string, language: "en" | "fr" | "rw"): Promise<boolean> {
  const slug = todayClaimSlug();
  const { error } = await supabase.from("child_achievements").insert({
    child_id: childId, language, type: "badge", slug,
  });
  if (!error || error.code === "23505") {
    qinvalidate(`childAchievements:${childId}`);
    qinvalidate(`dailyClaimed:${childId}:${language}`);
  }
  return !error || error.code === "23505";
}

// Per-task daily claim — slug: 'daily-task-{category}-YYYY-MM-DD'
export function getClaimedTasksToday(childId: string, language: "en" | "fr" | "rw"): Promise<Set<string>> {
  const dateStr = todayClaimSlug().replace("daily-claim-", "");
  return qcached(`claimedTasks:${childId}:${language}:${dateStr}`, async () => {
    const { data } = await supabase
      .from("child_achievements")
      .select("slug")
      .eq("child_id", childId)
      .eq("language", language)
      .eq("type", "badge")
      .like("slug", `daily-task-%-${dateStr}`);
    const set = new Set<string>();
    for (const row of data ?? []) {
      const cat = row.slug.replace(`daily-task-`, "").replace(`-${dateStr}`, "");
      set.add(cat);
    }
    return set;
  });
}

export async function claimTaskReward(childId: string, language: "en" | "fr" | "rw", category: string): Promise<boolean> {
  const dateStr = todayClaimSlug().replace("daily-claim-", "");
  const { error } = await supabase.from("child_achievements").insert({
    child_id: childId, language, type: "badge",
    slug: `daily-task-${category}-${dateStr}`,
  });
  if (!error || error.code === "23505") {
    qinvalidate(`childAchievements:${childId}`);
    qinvalidate(`claimedTasks:${childId}:${language}`);
  }
  return !error || error.code === "23505";
}
