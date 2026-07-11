import supabase from "@/lib/supabaseClient";
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
export async function getWeekStreak(childId: string, language: "en" | "fr" | "rw"): Promise<boolean[]> {
  const { data } = await supabase
    .from("child_progress")
    .select("completed_at")
    .eq("child_id", childId)
    .eq("language", language);
  const result = [false, false, false, false, false, false, false];
  if (!data) return result;
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  for (const row of data) {
    const diffDays = Math.floor(
      (new Date(row.completed_at as string).getTime() - monday.getTime()) / 86400000
    );
    if (diffDays >= 0 && diffDays < 7) result[diffDays] = true;
  }
  return result;
}

// Sum of `stars` across ALL completed missions (all-time) in the given
// language's journey, plus any challenge bonus stars. 0 if no progress yet.
export async function getTotalStars(childId: string, language: "en" | "fr" | "rw"): Promise<number> {
  const [progressRes, bonusRes] = await Promise.all([
    supabase.from("child_progress").select("mission_id, missions(stars)").eq("child_id", childId).eq("language", language),
    supabase.from("challenge_bonus_stars").select("stars").eq("child_id", childId).eq("language", language),
  ]);
  const missionStars = (progressRes.data ?? []).reduce((sum: number, row: any) => sum + (row.missions?.stars ?? 10), 0);
  const bonusStars   = (bonusRes.data   ?? []).reduce((sum: number, row: any) => sum + row.stars, 0);
  return missionStars + bonusStars;
}

// All-time set of "YYYY-MM-DD" (local-date) strings with >=1 completion in
// the given language's journey. Empty if no progress yet. Local-date (not
// UTC) to match getWeekStreak's local-day bucketing.
export async function getActivityDates(childId: string, language: "en" | "fr" | "rw"): Promise<Set<string>> {
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
export async function getCurrentLevel(childId: string, language: "en" | "fr" | "rw"): Promise<number> {
  const { data, error } = await supabase.rpc("get_current_level", {
    p_child_id: childId,
    p_language: language,
  });
  if (error) {
    console.error("[getCurrentLevel]", error.message);
    return 1;
  }
  return (data ?? 1) as number;
}

// Number of consecutive days (ending today or yesterday) with ≥1 completion
// in the given language's journey. If the child hasn't done anything today
// but did yesterday, the streak is still alive. Returns 0 if no history.
export async function getConsecutiveStreak(childId: string, language: "en" | "fr" | "rw"): Promise<number> {
  const dates = await getActivityDates(childId, language);
  if (dates.size === 0) return 0;

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const today = new Date();
  const todayKey = fmt(today);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = fmt(yesterday);

  // Start from today if active, else from yesterday (streak still alive)
  const startOffset = dates.has(todayKey) ? 0 : dates.has(yesterdayKey) ? 1 : -1;
  if (startOffset === -1) return 0;

  let streak = 0;
  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (dates.has(fmt(d))) streak++;
    else break;
  }
  return streak;
}

// Daily claim helpers — stored as a badge slug 'daily-claim-YYYY-MM-DD'.
// No migration needed; uses the existing child_achievements table.
function todayClaimSlug(): string {
  const d = new Date();
  return `daily-claim-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function hasDailyClaimedToday(childId: string, language: "en" | "fr" | "rw"): Promise<boolean> {
  const { data } = await supabase
    .from("child_achievements")
    .select("id")
    .eq("child_id", childId)
    .eq("language", language)
    .eq("type", "badge")
    .eq("slug", todayClaimSlug())
    .maybeSingle();
  return data !== null;
}

export async function claimDailyBonus(childId: string, language: "en" | "fr" | "rw"): Promise<boolean> {
  const slug = todayClaimSlug();
  const { error } = await supabase.from("child_achievements").insert({
    child_id: childId, language, type: "badge", slug,
  });
  return !error || error.code === "23505";
}

// Per-task daily claim — slug: 'daily-task-{category}-YYYY-MM-DD'
export async function getClaimedTasksToday(childId: string, language: "en" | "fr" | "rw"): Promise<Set<string>> {
  const dateStr = todayClaimSlug().replace("daily-claim-", "");
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
}

export async function claimTaskReward(childId: string, language: "en" | "fr" | "rw", category: string): Promise<boolean> {
  const dateStr = todayClaimSlug().replace("daily-claim-", "");
  const { error } = await supabase.from("child_achievements").insert({
    child_id: childId, language, type: "badge",
    slug: `daily-task-${category}-${dateStr}`,
  });
  return !error || error.code === "23505";
}
