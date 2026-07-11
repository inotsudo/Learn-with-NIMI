import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteContext = { params: Promise<{ id: string }> };

// POST — increment share_count on the creation
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.rpc("increment_share_count", { creation_id: id });
  if (error) {
    // Fallback: manual increment if RPC not available
    const { data: row } = await supabase.from("creations").select("share_count").eq("id", id).single();
    if (!row) return NextResponse.json({ error: "Creation not found" }, { status: 404 });
    await supabase.from("creations").update({ share_count: (row.share_count ?? 0) + 1 }).eq("id", id);
    return NextResponse.json({ success: true, shares: (row.share_count ?? 0) + 1 });
  }

  return NextResponse.json({ success: true, shares: data });
}

// GET — return current share count
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  const { data, error } = await supabase
    .from("creations")
    .select("share_count")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Creation not found" }, { status: 404 });

  return NextResponse.json({ id, shares: data.share_count ?? 0 });
}
