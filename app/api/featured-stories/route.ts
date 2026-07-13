export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Public marketing teaser endpoint — the `stories` table's RLS policy requires
// a logged-in session (supabase/migrations/001_initial_schema.sql:200), so an
// anonymous visitor's browser client can't read it directly. This route reads
// with the service-role key server-side and returns only published-story
// fields, without changing the table's RLS policy.
export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get("limit")) || 6;
  const { data, error } = await supabase
    .from("stories")
    .select("id, slug, title, cover_url, theme_emoji, sort_order")
    .eq("status", "published")
    .order("sort_order")
    .limit(limit);

  if (error) {
    console.error("[GET /api/featured-stories]", error);
    return NextResponse.json([], { status: 500 });
  }
  return NextResponse.json(data ?? [], {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
