// ══════════════════════════════════════════════════════════════
//  NIMIPIKO — Story Progress Repository (SA-1.3)
//
//  Data access for story completion, slot completion, and intro tracking.
//  Calls RPCs: complete_story_slot, get_story_completion,
//  get_story_intro_progress, mark_intro_item_consumed
// ══════════════════════════════════════════════════════════════

import supabase from "./supabaseClient";
import { qinvalidate, lsinvalidate } from "./queryCache";
import { queueOfflineSlotCompletion } from "./offlineSlotQueue";
import { recordSlotVocab } from "./vocabularyProgress";
import { incrementGoalProgressForChild } from "./learningGoals";
import type {
  StoryCompletion,
  StoryIntroProgress,
  CompleteSlotResult,
  CompleteSlotOutcome,
} from "./story-types";

export async function completeStorySlot(
  childId: string,
  missionId: string
): Promise<CompleteSlotOutcome | null> {
  const { data, error } = await supabase.rpc("complete_story_slot", {
    p_child_id: childId,
    p_mission_id: missionId,
  });
  if (error) {
    const isNetwork =
      !navigator.onLine ||
      error.message.toLowerCase().includes("failed to fetch") ||
      error.message.toLowerCase().includes("networkerror");
    if (isNetwork) {
      queueOfflineSlotCompletion({ childId, missionId, queuedAt: Date.now() });
      return { queued: true };
    }
    console.error("[completeStorySlot]", error);
    return null;
  }
  // Bust all per-child progress caches (prefix-only = all language variants).
  // lsinvalidate clears the localStorage rawProgressRows base cache that all
  // derived qcached values read from — without this, re-fetches after slot
  // completion return stale rows for up to TTL_SHORT (20s).
  lsinvalidate(`progressRows:${childId}`);
  qinvalidate(`weekStreak:${childId}`);
  qinvalidate(`totalStars:${childId}`);
  qinvalidate(`activityDates:${childId}`);
  qinvalidate(`currentLevel:${childId}`);
  qinvalidate(`childAchievements:${childId}`);
  qinvalidate(`childBadges:${childId}`);
  qinvalidate(`completedMissionIds:${childId}`);
  qinvalidate(`storyProgressStars:${childId}`);
  // Bust slot completion state so the story detail page reflects the new completion immediately.
  qinvalidate(`storySlots:${childId}`);
  qinvalidate(`storyLibrary:${childId}`);

  const result = data as CompleteSlotResult;

  // Record vocabulary exposure for this slot — fire-and-forget, non-fatal.
  // (recordSlotVocab also increments the vocab_encounters goal internally.)
  void recordSlotVocab(supabase, childId, missionId);

  // Advance slot_completions goal for every completed slot.
  void incrementGoalProgressForChild(supabase, childId, "slot_completions");

  // Advance story_completions goal when the last slot finishes the story.
  if (result.story_complete) {
    void incrementGoalProgressForChild(supabase, childId, "story_completions");
  }

  return { queued: false, result };
}

export async function getStoryCompletion(
  childId: string,
  storyId: string,
  language: string
): Promise<StoryCompletion | null> {
  const { data, error } = await supabase.rpc("get_story_completion", {
    p_child_id: childId,
    p_story_id: storyId,
    p_language: language,
  });
  if (error) {
    console.error("[getStoryCompletion]", error);
    return null;
  }
  const rows = data as StoryCompletion[] | null;
  return rows?.[0] ?? null;
}

export async function getStoryIntroProgress(
  childId: string,
  storyId: string,
  language: string
): Promise<StoryIntroProgress[]> {
  const { data, error } = await supabase.rpc("get_story_intro_progress", {
    p_child_id: childId,
    p_story_id: storyId,
    p_language: language,
  });
  if (error) {
    console.error("[getStoryIntroProgress]", error);
    return [];
  }
  return (data ?? []) as StoryIntroProgress[];
}

export async function markIntroItemConsumed(
  childId: string,
  storyId: string,
  slotKey: string
): Promise<void> {
  const { error } = await supabase.rpc("mark_intro_item_consumed", {
    p_child_id: childId,
    p_story_id: storyId,
    p_slot_key: slotKey,
  });
  if (error) {
    console.error("[markIntroItemConsumed]", error);
  }
}
