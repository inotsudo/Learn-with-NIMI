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
const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

export async function GET() {
  try {
    // Run both queries in parallel instead of sequentially.
    const [{ data: achData, error: achErr }, { data: stories, error: stErr }] = await Promise.all([
      supabase
        .from("child_achievements")
        .select("slug")
        .like("slug", "story-%-complete-%"),
      supabase
        .from("stories")
        .select("id, slug, title, cover_url, theme_emoji, sort_order, category")
        .eq("status", "published")
        .order("sort_order"),
    ]);

    if (achErr) { console.error("[GET /api/popular-stories] achievements:", achErr); return NextResponse.json([], { status: 500 }); }
    if (stErr)  { console.error("[GET /api/popular-stories] stories:", stErr);       return NextResponse.json([], { status: 500 }); }

    // Build completion count map — slug format: story-{story-slug}-complete-{lang}
    const countMap: Record<string, number> = {};
    for (const row of achData ?? []) {
      const match = row.slug.match(/^story-(.+)-complete-(?:en|fr|rw)$/);
      if (match) countMap[match[1]] = (countMap[match[1]] ?? 0) + 1;
    }

    const sorted = (stories ?? [])
      .map(s => ({ ...s, completions: countMap[s.slug] ?? 0 }))
      .sort((a, b) => b.completions - a.completions || a.sort_order - b.sort_order)
      .slice(0, 6);

    return NextResponse.json(sorted, { headers: CACHE_HEADERS });
  } catch (err: unknown) {
    console.error("[popular-stories] unexpected error:", err);
    return NextResponse.json([], { status: 500, headers: CACHE_HEADERS });
  }
}
