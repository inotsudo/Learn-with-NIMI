// ══════════════════════════════════════════════════════════════
//  NIMIPIKO — Story Repository (SA-1.3)
//
//  Data access for story library, details, slots, and recommendations.
//  Calls RPCs: get_story_library_progress, get_current_story,
//  get_unlocked_stories, get_story_details, get_story_slots,
//  get_story_recommendations
// ══════════════════════════════════════════════════════════════

import supabase from "./supabaseClient";
import { qcached, lscached, TTL_LONG } from "./queryCache";
import type {
  StoryLibraryItem,
  StoryDetails,
  StorySlot,
  StoryRecommendation,
} from "./story-types";

export function getStoryLibrary(
  childId: string,
  language: string
): Promise<StoryLibraryItem[]> {
  return qcached(`storyLibrary:${childId}:${language}`, async () => {
    // Fetch RPC and category map in parallel — categories are not in the RPC result set.
    const [{ data, error }, { data: cats }] = await Promise.all([
      supabase.rpc("get_story_library_progress", {
        p_child_id: childId,
        p_language: language,
      }),
      supabase.from("stories").select("id, category"),
    ]);
    if (error) {
      console.error("[getStoryLibrary]", error);
      return [];
    }
    const items = (data ?? []) as StoryLibraryItem[];
    if (cats) {
      const catMap = new Map(cats.map((c: { id: string; category: string | null }) => [c.id, c.category]));
      for (const item of items) item.category = catMap.get(item.sid) ?? null;
    }
    return items;
  });
}

export function getCurrentStoryId(
  childId: string,
  language: string
): Promise<string | null> {
  return qcached(`currentStoryId:${childId}:${language}`, async () => {
    const { data, error } = await supabase.rpc("get_current_story", {
      p_child_id: childId,
      p_language: language,
    });
    if (error) {
      console.error("[getCurrentStoryId]", error);
      return null;
    }
    return data as string | null;
  });
}

export function getUnlockedStoryIds(
  childId: string,
  language: string
): Promise<string[]> {
  return qcached(`unlockedStoryIds:${childId}:${language}`, async () => {
    const { data, error } = await supabase.rpc("get_unlocked_stories", {
      p_child_id: childId,
      p_language: language,
    });
    if (error) {
      console.error("[getUnlockedStoryIds]", error);
      return [];
    }
    return ((data ?? []) as { sid: string }[]).map((r) => r.sid);
  });
}

export function getStoryDetails(
  storyId: string,
  language: string
): Promise<StoryDetails | null> {
  return lscached(`storyDetails:${storyId}:${language}`, TTL_LONG, async () => {
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
  });
}

export function getStorySlots(
  childId: string,
  storyId: string,
  language: string
): Promise<StorySlot[]> {
  return qcached(`storySlots:${childId}:${storyId}:${language}`, async () => {
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
  }); // TTL_SHORT (20s) — slot completion status changes during a session
}

export function getStoryRecommendations(
  childId: string,
  language: string
): Promise<StoryRecommendation[]> {
  return qcached(`storyRecommendations:${childId}:${language}`, async () => {
    const { data, error } = await supabase.rpc("get_story_recommendations", {
      p_child_id: childId,
      p_language: language,
    });
    if (error) {
      console.error("[getStoryRecommendations]", error);
      return [];
    }
    return (data ?? []) as StoryRecommendation[];
  });
}

export function getStoryBySlug(slug: string): Promise<{ id: string; slug: string; title: string; cover_url: string | null; theme_emoji: string | null; sort_order: number } | null> {
  return lscached(`storyBySlug:${slug}`, TTL_LONG, async () => {
    const { data } = await supabase
      .from("stories")
      .select("id, slug, title, cover_url, theme_emoji, sort_order")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    return data ?? null;
  });
}

// Public, no-auth teaser list for the marketing landing page — no childId/progress
// involved. Goes through /api/featured-stories (service-role key, server-side) since
// the `stories` table's RLS policy requires a logged-in session for direct reads.
export async function getFeaturedStories(limit = 6): Promise<{ id: string; slug: string; title: string; cover_url: string | null; theme_emoji: string | null; sort_order: number }[]> {
  try {
    const res = await fetch(`/api/featured-stories?limit=${limit}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error("[getFeaturedStories]", error);
    return [];
  }
}

export interface PopularStory {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  theme_emoji: string | null;
  sort_order: number;
  category: string | null;
  completions: number;
}

// Returns up to 6 stories ordered by learner completion count.
// Falls back to sort_order when no one has completed any story yet.
export function getPopularStories(): Promise<PopularStory[]> {
  return qcached("popularStories", async () => {
    try {
      const res = await fetch("/api/popular-stories");
      if (!res.ok) return [];
      return await res.json() as PopularStory[];
    } catch (error) {
      console.error("[getPopularStories]", error);
      return [];
    }
  }, TTL_LONG);
}
