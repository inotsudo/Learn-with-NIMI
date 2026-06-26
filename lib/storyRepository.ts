// ══════════════════════════════════════════════════════════════
//  NIMIPIKO — Story Repository (SA-1.3)
//
//  Data access for story library, details, slots, and recommendations.
//  Calls RPCs: get_story_library_progress, get_current_story,
//  get_unlocked_stories, get_story_details, get_story_slots,
//  get_story_recommendations
// ══════════════════════════════════════════════════════════════

import supabase from "./supabaseClient";
import type {
  StoryLibraryItem,
  StoryDetails,
  StorySlot,
  StoryRecommendation,
} from "./story-types";

export async function getStoryLibrary(
  childId: string,
  language: string
): Promise<StoryLibraryItem[]> {
  const { data, error } = await supabase.rpc("get_story_library_progress", {
    p_child_id: childId,
    p_language: language,
  });
  if (error) {
    console.error("[getStoryLibrary]", error);
    return [];
  }
  const items = (data ?? []) as StoryLibraryItem[];

  // Fetch categories (not in the RPC)
  const { data: cats } = await supabase.from("stories").select("id, category");
  if (cats) {
    const catMap = new Map(cats.map((c: any) => [c.id, c.category]));
    for (const item of items) item.category = catMap.get(item.sid) ?? null;
  }

  return items;
}

export async function getCurrentStoryId(
  childId: string,
  language: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_current_story", {
    p_child_id: childId,
    p_language: language,
  });
  if (error) {
    console.error("[getCurrentStoryId]", error);
    return null;
  }
  return data as string | null;
}

export async function getUnlockedStoryIds(
  childId: string,
  language: string
): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_unlocked_stories", {
    p_child_id: childId,
    p_language: language,
  });
  if (error) {
    console.error("[getUnlockedStoryIds]", error);
    return [];
  }
  return ((data ?? []) as { sid: string }[]).map((r) => r.sid);
}

export async function getStoryDetails(
  storyId: string,
  language: string
): Promise<StoryDetails | null> {
  const { data, error } = await supabase.rpc("get_story_details", {
    p_story_id: storyId,
    p_language: language,
  });
  if (error) {
    console.error("[getStoryDetails]", error);
    return null;
  }
  const rows = data as StoryDetails[] | null;
  return rows?.[0] ?? null;
}

export async function getStorySlots(
  childId: string,
  storyId: string,
  language: string
): Promise<StorySlot[]> {
  const { data, error } = await supabase.rpc("get_story_slots", {
    p_child_id: childId,
    p_story_id: storyId,
    p_language: language,
  });
  if (error) {
    console.error("[getStorySlots]", error);
    return [];
  }
  return (data ?? []) as StorySlot[];
}

export async function getStoryRecommendations(
  childId: string,
  language: string
): Promise<StoryRecommendation[]> {
  const { data, error } = await supabase.rpc("get_story_recommendations", {
    p_child_id: childId,
    p_language: language,
  });
  if (error) {
    console.error("[getStoryRecommendations]", error);
    return [];
  }
  return (data ?? []) as StoryRecommendation[];
}

export async function getStoryBySlug(slug: string): Promise<{ id: string; slug: string; title: string; cover_url: string | null; theme_emoji: string | null; sort_order: number } | null> {
  const { data } = await supabase
    .from("stories")
    .select("id, slug, title, cover_url, theme_emoji, sort_order")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data ?? null;
}
