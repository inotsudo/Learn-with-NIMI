// NIMIPIKO — Supabase query helpers + application types

import supabase from "./supabaseClient";
import type { ActivityCategory } from "@/app/_activityData";

// ── App-level types ──────────────────────────────────────────

export interface Parent {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export type FavoriteCategory = "animals" | "space" | "music" | "art" | "stories" | "adventure";

export interface Child {
  id: string;
  parent_id: string;
  name: string;
  avatar_url: string | null;
  language: "en" | "fr" | "rw";
  age: number | null;
  favorite_category: FavoriteCategory | null;
  created_at: string;
}

export interface Story {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  sort_order: number;
  is_active: boolean;
  theme_title?: string | null;
  theme_emoji?: string | null;
}

export interface StoryPage {
  id: string;
  story_id: string;
  page_number: number;
  image_url: string | null;
  audio_url: string | null;
  text: string | null;
}

export interface ColoringPage {
  id: string;
  story_id: string;
  page_number: number;
  template_image_url: string | null;
}

export interface MissionContent {
  lyrics?: string[];
  prompts?: { emoji: string; label: string }[];
}

export interface Mission {
  id: string;
  story_id: string | null;
  day_number: number;
  type: "listen" | "read" | "color" | "move" | "sing" | "watch" | "story" | "quiz" | "find";
  title: string;
  duration_minutes: number;
  media_url: string | null;
  page_start: number | null;
  page_end: number | null;
  category?: string | null;
  stars?: number | null;
  subtitle?: string | null;
  tip_text?: string | null;
  content?: MissionContent | null;
}

export interface Category {
  slug: ActivityCategory;
  sort_order: number;
  default_type: string;
}

// One row per category, returned by the get_curriculum_missions RPC — the
// child's mission for that category at their current curriculum level,
// fully resolved for the child's language (with an `en` fallback baked in
// server-side).
export interface CurriculumMission extends Mission {
  category: ActivityCategory;
  level: number;
  completed: boolean;
  level_complete: boolean;
}

export interface CompleteCurriculumMissionResult {
  stars_earned: number;
  new_badges: string[];
  new_certificate: string | null;
  level: number;
  level_complete: boolean;
}

export interface ChildProgress {
  id: string;
  child_id: string;
  mission_id: string;
  completed_at: string;
}

export interface ColoringSave {
  id: string;
  child_id: string;
  coloring_page_id: string;
  canvas_data: object | null;
  saved_at: string;
}

export interface ChildBadge {
  id: string;
  child_id: string;
  badge_slug: string;
  earned_at: string;
}

export interface ChildAchievement {
  id: string;
  child_id: string;
  language: "en" | "fr" | "rw";
  type: "badge" | "certificate";
  slug: string;
  earned_at: string;
}

export interface ShopPurchase {
  id: string;
  child_id: string;
  item_id: string;
  price: number;
  purchased_at: string;
}

export interface ParentalSettings {
  id: string;
  parent_id: string;
  child_id: string;
  daily_limit_minutes: number;
  notifications_enabled: boolean;
}

// ── Storage URL helper ───────────────────────────────────────
// Accepts:
//   "flipbook/page-1.jpg"   → Supabase Storage public URL
//   "/story/page-1.jpg"     → returned as-is (local public/ file)
//   "https://..."           → returned as-is (already full URL)
export function getStorageUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("/")) return path;
  const slash = path.indexOf("/");
  if (slash === -1) return path;
  const bucket = path.substring(0, slash);
  const file   = path.substring(slash + 1);
  const { publicUrl } = supabase.storage.from(bucket).getPublicUrl(file).data;
  // Supabase does not URL-encode spaces — encode them so video/image src works
  return publicUrl.replace(/ /g, '%20');
}

// ── Parent queries ───────────────────────────────────────────

export async function getParent(): Promise<Parent | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("parents")
    .select("*")
    .eq("id", user.id)
    .single();
  return data ?? null;
}

// Ensures a parent row exists for the signed-in user.
// Handles accounts created before the new schema migration.
export async function ensureParentRow(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { console.warn("[ensureParentRow] no session"); return false; }
  const { error } = await supabase.from("parents").upsert(
    { id: user.id, email: user.email ?? "", name: user.user_metadata?.name ?? "Parent" },
    { onConflict: "id" }
  );
  if (error) console.error("[ensureParentRow] error:", error.message, error.code);
  return !error;
}

export async function updateParent(name: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("parents").update({ name }).eq("id", user.id);
}

// ── Children queries ─────────────────────────────────────────

export async function getChildren(): Promise<Child[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { console.warn("[getChildren] no session"); return []; }
  const { data, error } = await supabase
    .from("children")
    .select("*")
    .eq("parent_id", user.id)
    .order("created_at");
  if (error) console.error("[getChildren] error:", error.message, error.code);
  return (data ?? []) as Child[];
}

export async function createChild(
  child: Pick<Child, "name" | "avatar_url" | "language" | "age"> & Partial<Pick<Child, "favorite_category">>
): Promise<{ data: Child | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not signed in" };
  const parentOk = await ensureParentRow();
  if (!parentOk) return { data: null, error: "Could not create parent profile" };
  const { data, error } = await supabase
    .from("children")
    .insert({ ...child, parent_id: user.id })
    .select()
    .single();
  if (error) console.error("[createChild]", error);
  return { data: (data ?? null) as Child | null, error: error?.message ?? null };
}

export async function updateChild(
  childId: string,
  updates: Partial<Pick<Child, "name" | "avatar_url" | "language" | "age">>
): Promise<void> {
  await supabase.from("children").update(updates).eq("id", childId);
}

// Switching language starts a fresh per-category mission sequence for the
// child (child_progress is partitioned by language) — prior-language
// progress, stars and badges are preserved untouched.
export async function updateChildLanguage(
  childId: string,
  language: "en" | "fr" | "rw"
): Promise<void> {
  const { data: current } = await supabase
    .from("children")
    .select("language")
    .eq("id", childId)
    .maybeSingle();

  await supabase.from("children").update({ language }).eq("id", childId);

  const fromLanguage = current?.language as "en" | "fr" | "rw" | undefined;
  if (fromLanguage && fromLanguage !== language) {
    await supabase.from("language_switch_log").insert({
      child_id: childId,
      from_language: fromLanguage,
      to_language: language,
    });
  }
}

// ── Stories queries ──────────────────────────────────────────

export async function getActiveStories(): Promise<Story[]> {
  const { data } = await supabase
    .from("stories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as Story[];
}

export async function getStoryBySlug(slug: string): Promise<Story | null> {
  const { data } = await supabase
    .from("stories")
    .select("*")
    .eq("slug", slug)
    .single();
  return (data ?? null) as Story | null;
}

// ── Story pages queries ──────────────────────────────────────

// Fetches story pages with their per-language narration (story_page_versions),
// falling back to 'en' when the requested language has no published version.
export async function getStoryPages(
  storyId: string,
  language: "en" | "fr" | "rw" = "en"
): Promise<StoryPage[]> {
  const { data } = await supabase
    .from("story_pages")
    .select("id, story_id, page_number, image_url, story_page_versions(language, text, audio_url, published)")
    .eq("story_id", storyId)
    .order("page_number");

  return (data ?? []).map((page: any) => {
    const versions = (page.story_page_versions ?? []) as
      { language: string; text: string | null; audio_url: string | null; published: boolean }[];
    const version = versions.find(v => v.language === language && v.published)
      ?? versions.find(v => v.language === "en" && v.published);
    return {
      id: page.id,
      story_id: page.story_id,
      page_number: page.page_number,
      image_url: page.image_url,
      audio_url: version?.audio_url ?? null,
      text: version?.text ?? null,
    } as StoryPage;
  });
}

// ── Coloring pages queries ───────────────────────────────────

export async function getColoringPages(storyId: string): Promise<ColoringPage[]> {
  const { data } = await supabase
    .from("coloring_pages")
    .select("*")
    .eq("story_id", storyId)
    .order("page_number");
  return (data ?? []) as ColoringPage[];
}

// ── Missions queries ─────────────────────────────────────────

// One row per category — the child's mission for their current curriculum
// level, fully resolved (language fallback to 'en', completion + level-
// complete flags applied server-side). Source of truth for `/`,
// `/missions`, `/missions/[category]`.
//
// Cached to localStorage on every successful fetch so a child who already
// viewed today's missions can keep learning with no signal (village
// connectivity use case) — on failure we fall back to that cache instead
// of an empty array.
function curriculumCacheKey(childId: string): string {
  return `nimi_cached_missions_${childId}`;
}

export async function getCurriculumMissions(childId: string): Promise<CurriculumMission[]> {
  const { data, error } = await supabase.rpc("get_curriculum_missions", { p_child_id: childId });
  if (error) {
    console.error("[getCurriculumMissions]", error.message);
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(curriculumCacheKey(childId));
      if (cached) {
        try {
          return JSON.parse(cached) as CurriculumMission[];
        } catch {
          // fall through to empty array below
        }
      }
    }
    return [];
  }
  if (typeof window !== "undefined") {
    localStorage.setItem(curriculumCacheKey(childId), JSON.stringify(data ?? []));
  }
  return (data ?? []) as CurriculumMission[];
}

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
// language's journey. 0 if no progress yet.
export async function getTotalStars(childId: string, language: "en" | "fr" | "rw"): Promise<number> {
  const { data } = await supabase
    .from("child_progress")
    .select("mission_id, missions(stars)")
    .eq("child_id", childId)
    .eq("language", language);
  if (!data) return 0;
  return data.reduce((sum: number, row: any) => sum + (row.missions?.stars ?? 10), 0);
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

// ── Child progress queries ───────────────────────────────────

// Mission ids completed by this child in the given language's journey.
export async function getCompletedMissionIds(childId: string, language: "en" | "fr" | "rw"): Promise<string[]> {
  const { data } = await supabase
    .from("child_progress")
    .select("mission_id")
    .eq("child_id", childId)
    .eq("language", language);
  return (data ?? []).map((r: { mission_id: string }) => r.mission_id);
}

export async function completeChildMission(
  childId: string,
  missionId: string
): Promise<void> {
  await completeCurriculumMission(childId, missionId);
}

// Records a mission completion (in the child's current language), awards
// stars, and returns any newly-earned badges / certificate plus the child's
// curriculum level after this completion.
// Returns null on failure (offline/network error) so callers can tell a
// real completion apart from one that needs to be queued and retried.
export async function completeCurriculumMission(
  childId: string,
  missionId: string
): Promise<CompleteCurriculumMissionResult | null> {
  const { data, error } = await supabase.rpc("complete_curriculum_mission", {
    p_child_id: childId,
    p_mission_id: missionId,
  });
  if (error) {
    console.error("[completeCurriculumMission]", error.message);
    return null;
  }
  return data as CompleteCurriculumMissionResult;
}

// Fire-and-forget: tells the server to push a notification to the parent
// about this mission completion. Never throws into the caller.
export async function notifyPushOnCompletion(
  childId: string,
  category: string,
  result: CompleteCurriculumMissionResult
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch("/api/push/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        child_id: childId,
        category,
        stars_earned: result.stars_earned,
        new_badges: result.new_badges,
        new_certificate: result.new_certificate,
      }),
    });
  } catch {
    // best-effort only
  }
}

// ── Coloring saves queries ───────────────────────────────────

export async function getColoringSave(
  childId: string,
  coloringPageId: string
): Promise<ColoringSave | null> {
  const { data } = await supabase
    .from("coloring_saves")
    .select("*")
    .eq("child_id", childId)
    .eq("coloring_page_id", coloringPageId)
    .single();
  return (data ?? null) as ColoringSave | null;
}

export async function saveColoringProgress(
  childId: string,
  coloringPageId: string,
  canvasData: object
): Promise<void> {
  await supabase.from("coloring_saves").upsert({
    child_id: childId,
    coloring_page_id: coloringPageId,
    canvas_data: canvasData,
    saved_at: new Date().toISOString(),
  });
}

// ── Badges queries ───────────────────────────────────────────

export async function getChildBadges(childId: string): Promise<ChildBadge[]> {
  const { data } = await supabase
    .from("child_badges")
    .select("*")
    .eq("child_id", childId)
    .order("earned_at");
  return (data ?? []) as ChildBadge[];
}

export async function awardBadge(
  childId: string,
  badgeSlug: string
): Promise<void> {
  await supabase
    .from("child_badges")
    .upsert({ child_id: childId, badge_slug: badgeSlug });
}

// ── Achievements queries ─────────────────────────────────────

// All badges/certificates ever earned by this child, across all 3
// language journeys (the Achievement Dashboard needs all of them at once).
export async function getChildAchievements(childId: string): Promise<ChildAchievement[]> {
  const { data, error } = await supabase
    .from("child_achievements")
    .select("*")
    .eq("child_id", childId);
  if (error) {
    console.error("[getChildAchievements]", error.message);
    return [];
  }
  return (data ?? []) as ChildAchievement[];
}

// ── Reward Shop queries ───────────────────────────────────────

// All cosmetic shop items this child has ever unlocked.
export async function getShopPurchases(childId: string): Promise<ShopPurchase[]> {
  const { data, error } = await supabase
    .from("shop_purchases")
    .select("*")
    .eq("child_id", childId);
  if (error) {
    console.error("[getShopPurchases]", error.message);
    return [];
  }
  return (data ?? []) as ShopPurchase[];
}

// Records a shop purchase, spending `price` stars on `itemId`.
export async function purchaseShopItem(childId: string, itemId: string, price: number): Promise<ShopPurchase | null> {
  const { data, error } = await supabase
    .from("shop_purchases")
    .insert({ child_id: childId, item_id: itemId, price })
    .select()
    .single();
  if (error) {
    console.error("[purchaseShopItem]", error.message);
    return null;
  }
  return data as ShopPurchase;
}

// Highest level number defined in the curriculum (currently 3). Drives how
// many "Explorer Badge" tiers the Achievement Dashboard renders.
export async function getMaxCurriculumLevel(): Promise<number> {
  const { data } = await supabase
    .from("level_missions")
    .select("level_number")
    .order("level_number", { ascending: false })
    .limit(1);
  return data?.[0]?.level_number ?? 1;
}

// ── Parent Intelligence Dashboard (Phase BH) ─────────────────

export interface LevelMissionRow {
  level_number: number;
  category_slug: ActivityCategory;
  mission_id: string;
}

// All (level_number, category_slug) -> mission_id rows. Small table,
// readable by any authenticated user (migration 026 policy). Used to
// derive per-language X/8 level progress and overall completion %.
export async function getLevelMissions(): Promise<LevelMissionRow[]> {
  const { data, error } = await supabase
    .from("level_missions")
    .select("level_number, category_slug, mission_id");
  if (error) {
    console.error("[getLevelMissions]", error.message);
    return [];
  }
  return (data ?? []) as LevelMissionRow[];
}

export interface ProgressRow {
  mission_id: string;
  language: "en" | "fr" | "rw";
  category: ActivityCategory;
  stars_earned: number;
  completed_at: string;
}

// All child_progress rows for this child, across ALL 3 language journeys
// (same table/RLS as getCompletedMissionIds, without the language filter).
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

// ── Parental settings ────────────────────────────────────────

export async function getParentalSettings(
  childId: string
): Promise<ParentalSettings | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("parental_settings")
    .select("*")
    .eq("parent_id", user.id)
    .eq("child_id", childId)
    .single();
  return (data ?? null) as ParentalSettings | null;
}

export async function updateParentalSettings(
  childId: string,
  settings: Partial<Pick<ParentalSettings, "daily_limit_minutes" | "notifications_enabled">>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("parental_settings").upsert({
    parent_id: user.id,
    child_id: childId,
    ...settings,
  });
}
