export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Returns up to 6 published stories ordered by how many learners have
// completed them (badge slug: story-{slug}-complete-{lang}).
// Falls back to sort_order when no completions exist yet.
export async function GET() {
  // 1. Count completions per story slug from child_achievements
  const { data: achData, error: achErr } = await supabase
    .from("child_achievements")
    .select("slug")
    .like("slug", "story-%-complete-%");

  if (achErr) {
    console.error("[GET /api/popular-stories] achievements:", achErr);
    return NextResponse.json([], { status: 500 });
  }

  // Build completion count map keyed by story slug
  const countMap: Record<string, number> = {};
  for (const row of achData ?? []) {
    // slug format: story-{story-slug}-complete-{lang}
    const match = row.slug.match(/^story-(.+)-complete-(?:en|fr|rw)$/);
    if (match) {
      const storySlug = match[1];
      countMap[storySlug] = (countMap[storySlug] ?? 0) + 1;
    }
  }

  // 2. Fetch published stories
  const { data: stories, error: stErr } = await supabase
    .from("stories")
    .select("id, slug, title, cover_url, theme_emoji, sort_order, category")
    .eq("status", "published")
    .order("sort_order");

  if (stErr) {
    console.error("[GET /api/popular-stories] stories:", stErr);
    return NextResponse.json([], { status: 500 });
  }

  // 3. Sort by completion count desc, then sort_order asc, take top 6
  const sorted = (stories ?? [])
    .map(s => ({ ...s, completions: countMap[s.slug] ?? 0 }))
    .sort((a, b) => b.completions - a.completions || a.sort_order - b.sort_order)
    .slice(0, 6);

  return NextResponse.json(sorted);
}
