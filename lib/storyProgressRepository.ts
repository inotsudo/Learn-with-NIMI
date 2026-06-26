// ══════════════════════════════════════════════════════════════
//  NIMIPIKO — Story Progress Repository (SA-1.3)
//
//  Data access for story completion, slot completion, and intro tracking.
//  Calls RPCs: complete_story_slot, get_story_completion,
//  get_story_intro_progress, mark_intro_item_consumed
// ══════════════════════════════════════════════════════════════

import supabase from "./supabaseClient";
import type {
  StoryCompletion,
  StoryIntroProgress,
  CompleteSlotResult,
} from "./story-types";

export async function completeStorySlot(
  childId: string,
  missionId: string
): Promise<CompleteSlotResult | null> {
  const { data, error } = await supabase.rpc("complete_story_slot", {
    p_child_id: childId,
    p_mission_id: missionId,
  });
  if (error) {
    console.error("[completeStorySlot]", error);
    return null;
  }
  return data as CompleteSlotResult;
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
