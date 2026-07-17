import supabase from "@/lib/supabaseClient";
import { qcached, qinvalidate } from "@/lib/queryCache";
import type { ChildBadge, ChildAchievement } from "./types";

export function getChildBadges(childId: string, language: string): Promise<ChildBadge[]> {
  return qcached(`childBadges:${childId}:${language}`, async () => {
    const { data } = await supabase
      .from("child_badges")
      .select("*")
      .eq("child_id", childId)
      .eq("language", language)
      .order("earned_at");
    return (data ?? []) as ChildBadge[];
  });
}

export async function awardBadge(
  childId: string,
  language: string,
  badgeSlug: string
): Promise<void> {
  await supabase
    .from("child_badges")
    .upsert({ child_id: childId, language, badge_slug: badgeSlug });
  qinvalidate(`childBadges:${childId}:${language}`);
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
  qinvalidate(`childBadges:${childId}:${language}`);
  qinvalidate(`childAchievements:${childId}`);
  return (data as string[]) ?? [];
}

// All badges/certificates ever earned by this child, across all 3
// language journeys (the Achievement Dashboard needs all of them at once).
export function getChildAchievements(childId: string): Promise<ChildAchievement[]> {
  return qcached(`childAchievements:${childId}`, async () => {
    const { data, error } = await supabase
      .from("child_achievements")
      .select("*")
      .eq("child_id", childId);
    if (error) {
      console.error("[getChildAchievements]", error.message);
      return [];
    }
    return (data ?? []) as ChildAchievement[];
  });
}

// All badge slug → image_url mappings (cached; rarely changes).
export function getBadgeImages(): Promise<Record<string, string>> {
  return qcached("badgeImages", async () => {
    const { data } = await supabase
      .from("badge_images")
      .select("slug, image_url");
    const map: Record<string, string> = {};
    for (const row of (data ?? []) as { slug: string; image_url: string | null }[]) {
      if (row.image_url) map[row.slug] = row.image_url;
    }
    return map;
  });
}

// All earned certificates for a child+language (type='certificate' rows in child_achievements).
export function getChildCertificates(childId: string, language: string): Promise<ChildAchievement[]> {
  return qcached(`childCerts:${childId}:${language}`, async () => {
    const { data } = await supabase
      .from("child_achievements")
      .select("*")
      .eq("child_id", childId)
      .eq("language", language)
      .eq("type", "certificate")
      .order("earned_at", { ascending: false });
    return (data ?? []) as ChildAchievement[];
  });
}

// Returns set of challenge_slug strings already claimed for this child+language.
export function getClaimedChallenges(childId: string, language: "en" | "fr" | "rw"): Promise<Set<string>> {
  return qcached(`claimedChallenges:${childId}:${language}`, async () => {
    const { data } = await supabase
      .from("challenge_bonus_stars")
      .select("challenge_slug")
      .eq("child_id", childId)
      .eq("language", language);
    return new Set((data ?? []).map((r: any) => r.challenge_slug));
  });
}

// Claims a challenge reward — inserts a row; no-ops if already claimed (unique conflict).
export async function claimChallengeReward(
  childId: string, language: "en" | "fr" | "rw", challengeSlug: string, stars: number
): Promise<boolean> {
  const { error } = await supabase.from("challenge_bonus_stars").insert({
    child_id: childId, language, challenge_slug: challengeSlug, stars,
  });
  if (!error || error.code === "23505") {
    qinvalidate(`bonusStars:${childId}:${language}`);
    qinvalidate(`totalStars:${childId}:${language}`);
    qinvalidate(`claimedChallenges:${childId}:${language}`);
  }
  return !error || error.code === "23505";
}
