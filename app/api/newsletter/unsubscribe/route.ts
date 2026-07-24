import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/serviceClient";



const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const supabase = getServiceClient();
  const token = req.nextUrl.searchParams.get("token") ?? "";

  if (!TOKEN_RE.test(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("newsletter_signups")
    .select("id, unsubscribed_at")
    .eq("unsubscribe_token", token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  if (data.unsubscribed_at) {
    return NextResponse.json({ ok: true, already: true });
  }

  const { error: updateError } = await supabase
    .from("newsletter_signups")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token);

  if (updateError) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
