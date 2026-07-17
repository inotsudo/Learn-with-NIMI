import supabase from "@/lib/supabaseClient";
import { qcached, lscached, TTL_LONG } from "@/lib/queryCache";
import type { Story, StoryPage, ColoringPage } from "./types";

export function getActiveStories(): Promise<Story[]> {
  return lscached("activeStories", TTL_LONG, async () => {
    const { data } = await supabase
      .from("stories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    return (data ?? []) as Story[];
  });
}

export function getStoryBySlug(slug: string): Promise<Story | null> {
  return lscached(`storyBySlugFull:${slug}`, TTL_LONG, async () => {
    const { data } = await supabase
      .from("stories")
      .select("*")
      .eq("slug", slug)
      .single();
    return (data ?? null) as Story | null;
  });
}

// Fetches story pages with their per-language narration (story_page_versions),
// falling back to 'en' when the requested language has no published version.
// Cached TTL_LONG — content only changes when an admin publishes new versions.
export function getStoryPages(
  storyId: string,
  language: "en" | "fr" | "rw" = "en"
): Promise<StoryPage[]> {
  return lscached(`storyPages:${storyId}:${language}`, TTL_LONG, async () => {
    const { data } = await supabase
      .from("story_pages")
      .select("id, story_id, page_number, image_url, story_page_versions(language, text, audio_url, image_url, published)")
      .eq("story_id", storyId)
      .order("page_number");

    return (data ?? []).map((page: any) => {
      const versions = (page.story_page_versions ?? []) as
        { language: string; text: string | null; audio_url: string | null; image_url: string | null; published: boolean }[];
      const version = versions.find(v => v.language === language && v.published)
        ?? versions.find(v => v.language === "en" && v.published);
      return {
        id: page.id,
        story_id: page.story_id,
        page_number: page.page_number,
        // Per-language image takes precedence; shared image is the backwards-compat fallback
        image_url: version?.image_url ?? page.image_url,
        audio_url: version?.audio_url ?? null,
        text: version?.text ?? null,
      } as StoryPage;
    });
  });
}

export function getColoringPages(storyId: string): Promise<ColoringPage[]> {
  return lscached(`coloringPages:${storyId}`, TTL_LONG, async () => {
    const { data } = await supabase
      .from("coloring_pages")
      .select("*")
      .eq("story_id", storyId)
      .order("page_number");
    return (data ?? []) as ColoringPage[];
  });
}
