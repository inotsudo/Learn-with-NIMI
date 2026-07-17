import supabase from "@/lib/supabaseClient";
import { qcached, qinvalidate, lscached, lsinvalidate, TTL_LONG } from "@/lib/queryCache";
import type { CurriculumMission, CompleteCurriculumMissionResult, LevelMissionRow } from "./types";

function curriculumCacheKey(childId: string): string {
  return `nimi_cached_missions_${childId}`;
}

// One row per category — the child's mission for their current curriculum
// level, fully resolved (language fallback to 'en', completion + level-
// complete flags applied server-side). Source of truth for `/`,
// `/missions`, `/missions/[category]`.
//
// Cached to localStorage on every successful fetch so a child who already
// viewed today's missions can keep learning with no signal (village
// connectivity use case) — on failure we fall back to that cache instead
// of an empty array.
export function getCurriculumMissions(childId: string): Promise<CurriculumMission[]> {
  return qcached(`curriculumMissions:${childId}`, async () => {
    const { data, error } = await supabase.rpc("get_curriculum_missions", { p_child_id: childId });
    if (error) {
      console.error("[getCurriculumMissions]", error.message);
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(curriculumCacheKey(childId));
        if (cached) {
          try { return JSON.parse(cached) as CurriculumMission[]; } catch { /* fall through */ }
        }
      }
      return [];
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(curriculumCacheKey(childId), JSON.stringify(data ?? []));
    }
    return (data ?? []) as CurriculumMission[];
  });
}

// Mission ids completed by this child in the given language's journey.
export function getCompletedMissionIds(childId: string, language: "en" | "fr" | "rw"): Promise<string[]> {
  return qcached(`completedMissionIds:${childId}:${language}`, async () => {
    const { data } = await supabase
      .from("child_progress")
      .select("mission_id")
      .eq("child_id", childId)
      .eq("language", language);
    return (data ?? []).map((r: { mission_id: string }) => r.mission_id);
  });
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
  // Bust per-child progress caches so AppShell + home page see fresh data.
  qinvalidate(`progressRows:${childId}`);  lsinvalidate(`progressRows:${childId}`);
  qinvalidate(`bonusStars:${childId}`);    lsinvalidate(`bonusStars:${childId}`);
  qinvalidate(`weekStreak:${childId}`);
  qinvalidate(`weekCounts:${childId}`);
  qinvalidate(`totalStars:${childId}`);
  qinvalidate(`activityDates:${childId}`);
  qinvalidate(`consecutiveStreak:${childId}`);
  qinvalidate(`currentLevel:${childId}`);
  qinvalidate(`childAchievements:${childId}`);
  qinvalidate(`childBadges:${childId}`);
  qinvalidate(`completedMissionIds:${childId}`);
  qinvalidate(`storyProgressStars:${childId}`);
  qinvalidate(`curriculumMissions:${childId}`);
  qinvalidate(`completedStoriesCount:${childId}`);
  qinvalidate(`allChildProgress:${childId}`);
  qinvalidate(`currentStoryId:${childId}`);
  qinvalidate(`unlockedStoryIds:${childId}`);
  return data as CompleteCurriculumMissionResult;
}

// All (level_number, category_slug) -> mission_id rows. Small table,
// readable by any authenticated user (migration 026 policy). Used to
// derive per-language X/8 level progress and overall completion %.
export function getLevelMissions(): Promise<LevelMissionRow[]> {
  return lscached("levelMissions", TTL_LONG, async () => {
    const { data, error } = await supabase
      .from("level_missions")
      .select("level_number, category_slug, mission_id");
    if (error) {
      console.error("[getLevelMissions]", error.message);
      return [];
    }
    return (data ?? []) as LevelMissionRow[];
  });
}

// Highest level number defined in the curriculum (currently 3). Drives how
// many "Explorer Badge" tiers the Achievement Dashboard renders.
export function getMaxCurriculumLevel(): Promise<number> {
  return lscached("maxCurriculumLevel", TTL_LONG, async () => {
    const { data } = await supabase
      .from("level_missions")
      .select("level_number")
      .order("level_number", { ascending: false })
      .limit(1);
    return data?.[0]?.level_number ?? 1;
  });
}
