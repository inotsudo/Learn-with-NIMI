// ══════════════════════════════════════════════════════════════
//  NIMIPIKO — Weekly Challenge Repository (SA-1.3)
//
//  Data access for weekly challenges and completion.
//  Calls RPCs: get_weekly_challenges, complete_weekly_challenge
// ══════════════════════════════════════════════════════════════

import supabase from "./supabaseClient";
import type {
  WeeklyChallenge,
  CompleteChallengeResult,
} from "./story-types";

export async function getWeeklyChallenges(
  childId: string,
  storyId: string,
  language: string
): Promise<WeeklyChallenge[]> {
  const { data, error } = await supabase.rpc("get_weekly_challenges", {
    p_child_id: childId,
    p_story_id: storyId,
    p_language: language,
  });
  if (error) {
    console.error("[getWeeklyChallenges]", error);
    return [];
  }
  return (data ?? []) as WeeklyChallenge[];
}

export async function completeWeeklyChallenge(
  childId: string,
  challengeId: string
): Promise<CompleteChallengeResult | null> {
  const { data, error } = await supabase.rpc("complete_weekly_challenge", {
    p_child_id: childId,
    p_challenge_id: challengeId,
  });
  if (error) {
    console.error("[completeWeeklyChallenge]", error);
    return null;
  }
  return data as CompleteChallengeResult;
}
