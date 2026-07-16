import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteContext = { params: Promise<{ id: string }> };

// POST — toggle like (insert if not exists, delete if already liked)
export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { id: creation_id } = await ctx.params;

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user_id = user.id;

    // Check existing like
    const { data: existing } = await supabase
      .from("likes")
      .select("id")
      .eq("creation_id", creation_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (existing) {
      await supabase.from("likes").delete().eq("id", existing.id);
    } else {
      await supabase.from("likes").insert({ creation_id, user_id });
    }

    const { count } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("creation_id", creation_id);

    return NextResponse.json({ liked: !existing, count: count ?? 0 });
  } catch (err: unknown) {
    console.error("[like POST] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET — return like count + whether current user has liked
export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { id: creation_id } = await ctx.params;

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);

    const [{ count }, likedRow] = await Promise.all([
      supabase.from("likes").select("*", { count: "exact", head: true }).eq("creation_id", creation_id),
      user
        ? supabase.from("likes").select("id").eq("creation_id", creation_id).eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return NextResponse.json({ count: count ?? 0, liked: !!likedRow.data });
  } catch (err: unknown) {
    console.error("[like GET] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
