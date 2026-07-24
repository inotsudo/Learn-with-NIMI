// lib/nimi/storyContentFetcher.ts
// Fetches raw story content (book pages + song lyrics) from Supabase for Nimi's
// story knowledge block. Both calls are best-effort — null on any failure.

import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchBookPages(
  supabase: SupabaseClient,
  storyId: string,
  language: string,
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("story_pages")
      .select("page_number, story_page_versions(language, text, published)")
      .eq("story_id", storyId)
      .order("page_number");

    if (!data || data.length === 0) return null;

    const lines: string[] = [];
    for (const page of data as Array<{
      page_number: number;
      story_page_versions: Array<{ language: string; text: string | null; published: boolean }>;
    }>) {
      const versions = page.story_page_versions ?? [];
      const version =
        versions.find(v => v.language === language && v.published) ??
        versions.find(v => v.language === "en" && v.published);
      const text = version?.text?.trim();
      if (text) lines.push(`Page ${page.page_number}: ${text}`);
    }

    return lines.length > 0
      ? `STORY BOOK PAGES:\n${lines.join("\n")}`
      : null;
  } catch {
    return null;
  }
}

export async function fetchSongLyrics(
  supabase: SupabaseClient,
  storyId: string,
  language: string,
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("missions")
      .select("title, mission_versions(language, title, content_json, published)")
      .eq("story_id", storyId)
      .eq("type", "sing");

    if (!data || data.length === 0) return null;

    const blocks: string[] = [];
    for (const mission of data as Array<{
      title: string;
      mission_versions: Array<{
        language: string;
        title: string | null;
        content_json: { lyrics?: string[] } | null;
        published: boolean;
      }>;
    }>) {
      const versions = mission.mission_versions ?? [];
      const version =
        versions.find(v => v.language === language && v.published) ??
        versions.find(v => v.language === "en" && v.published);
      const lyrics = version?.content_json?.lyrics;
      if (Array.isArray(lyrics) && lyrics.length > 0) {
        const songTitle = version?.title ?? mission.title ?? "Song";
        blocks.push(`SONG: "${songTitle}"\n${lyrics.map((l, i) => `  ${i + 1}. ${l}`).join("\n")}`);
      }
    }

    return blocks.length > 0
      ? `SONG LYRICS:\n${blocks.join("\n\n")}`
      : null;
  } catch {
    return null;
  }
}
