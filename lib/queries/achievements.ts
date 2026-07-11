import supabase from "@/lib/supabaseClient";
import type { ChildBadge, ChildAchievement } from "./types";

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

// Calls the DB function that checks story-count and star-count milestones
// and inserts any newly earned milestone badges. Returns newly-awarded slugs.
export async function awardMilestoneBadges(
  childId: string,
  language: string
): Promise<string[]> {
  const { data, error } = await supabase.rpc("_sa_award_milestone_badges", {
    p_child_id: childId,
    p_language: language,
  });
  if (error) {
    console.error("[awardMilestoneBadges]", error.message);
    return [];
  }
  return (data as string[]) ?? [];
}

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

// Returns set of challenge_slug strings already claimed for this child+language.
export async function getClaimedChallenges(childId: string, language: "en" | "fr" | "rw"): Promise<Set<string>> {
  const { data } = await supabase
    .from("challenge_bonus_stars")
    .select("challenge_slug")
    .eq("child_id", childId)
    .eq("language", language);
  return new Set((data ?? []).map((r: any) => r.challenge_slug));
}

// Claims a challenge reward — inserts a row; no-ops if already claimed (unique conflict).
export async function claimChallengeReward(
  childId: string, language: "en" | "fr" | "rw", challengeSlug: string, stars: number
): Promise<boolean> {
  const { error } = await supabase.from("challenge_bonus_stars").insert({
    child_id: childId, language, challenge_slug: challengeSlug, stars,
  });
  return !error || error.code === "23505"; // 23505 = unique violation (already claimed)
}
