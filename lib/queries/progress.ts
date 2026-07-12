import supabase from "@/lib/supabaseClient";
import { qcached, qinvalidate } from "@/lib/queryCache";
import { computeStreaks } from "@/lib/parentInsights";
import { getUsedShieldDates } from "./shop";
import type { ProgressRow } from "./types";

// Sum of `stars` for missions completed today (in the given language's
// journey). 0 if no progress yet.
export async function getTodayStars(childId: string, language: "en" | "fr" | "rw"): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("child_progress")
    .select("mission_id, completed_at, missions(stars)")
    .eq("child_id", childId)
    .eq("language", language)
    .gte("completed_at", startOfDay.toISOString());
  if (!data) return 0;
  return data.reduce((sum: number, row: any) => sum + (row.missions?.stars ?? 10), 0);
}

// Which of the last 7 days (Mon-Sun, current week) had >=1 completion in the
// given language's journey. Index 0 = Monday. All-false if no progress yet.
export function getWeekStreak(childId: string, language: "en" | "fr" | "rw"): Promise<boolean[]> {
  return qcached(`weekStreak:${childId}:${language}`, async () => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("child_progress")
      .select("completed_at")
      .eq("child_id", childId)
      .eq("language", language)
      .gte("completed_at", monday.toISOString());

    const result = [false, false, false, false, false, false, false];
    if (!data) return result;
    for (const row of data) {
      const diffDays = Math.floor(
        (new Date(row.completed_at as string).getTime() - monday.getTime()) / 86400000
      );
      if (diffDays >= 0 && diffDays < 7) result[diffDays] = true;
    }
    return result;
  });
}

// Sum of `stars` across ALL completed missions (all-time) in the given
// language's journey, plus any challenge bonus stars. 0 if no progress yet.
export function getTotalStars(childId: string, language: "en" | "fr" | "rw"): Promise<number> {
  return qcached(`totalStars:${childId}:${language}`, async () => {
    const [progressRes, bonusRes] = await Promise.all([
      supabase.from("child_progress").select("mission_id, missions(stars)").eq("child_id", childId).eq("language", language),
      supabase.from("challenge_bonus_stars").select("stars").eq("child_id", childId).eq("language", language),
    ]);
    const missionStars = (progressRes.data ?? []).reduce((sum: number, row: any) => sum + (row.missions?.stars ?? 10), 0);
    const bonusStars   = (bonusRes.data   ?? []).reduce((sum: number, row: any) => sum + row.stars, 0);
    return missionStars + bonusStars;
  });
}

// All-time set of "YYYY-MM-DD" (local-date) strings with >=1 completion in
// the given language's journey. Empty if no progress yet. Local-date (not
// UTC) to match getWeekStreak's local-day bucketing.
export function getActivityDates(childId: string, language: "en" | "fr" | "rw"): Promise<Set<string>> {
  return qcached(`activityDates:${childId}:${language}`, async () => {
    const { data } = await supabase
      .from("child_progress")
      .select("completed_at")
      .eq("child_id", childId)
      .eq("language", language);
    const dates = new Set<string>();
    for (const row of data ?? []) {
      const d = new Date(row.completed_at as string);
      dates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    return dates;
  });
}

// Number of completions per day (Mon-Sun, current week) in the given
// language's journey. Index 0 = Monday.
export async function getWeekActivityCounts(childId: string, language: "en" | "fr" | "rw"): Promise<number[]> {
  const { data } = await supabase
    .from("child_progress")
    .select("completed_at")
    .eq("child_id", childId)
    .eq("language", language);
  const result = [0, 0, 0, 0, 0, 0, 0];
  if (!data) return result;
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  for (const row of data) {
    const diffDays = Math.floor(
      (new Date(row.completed_at as string).getTime() - monday.getTime()) / 86400000
    );
    if (diffDays >= 0 && diffDays < 7) result[diffDays]++;
  }
  return result;
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

// Shield-aware consecutive day streak. Delegates to computeStreaks so the
// algorithm is never duplicated. Any caller automatically gets the correct
// shielded count without knowing about shields.
export async function getConsecutiveStreak(childId: string, language: "en" | "fr" | "rw"): Promise<number> {
  const [dates, shieldedDates] = await Promise.all([
    getActivityDates(childId, language),
    getUsedShieldDates(childId, language),
  ]);
  return computeStreaks(dates, new Date(), shieldedDates).current;
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
