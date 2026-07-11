import supabase from "@/lib/supabaseClient";
import type { Story, StoryPage, ColoringPage } from "./types";

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

export async function getColoringPages(storyId: string): Promise<ColoringPage[]> {
  const { data } = await supabase
    .from("coloring_pages")
    .select("*")
    .eq("story_id", storyId)
    .order("page_number");
  return (data ?? []) as ColoringPage[];
}
