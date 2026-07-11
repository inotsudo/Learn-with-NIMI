import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendCancellationConfirmation } from "@/lib/email";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userError } = await sb.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  // Mark cancel_at_period_end so the renewal cron skips it
  const { data: sub, error } = await sb
    .from("nimipiko_subscriptions")
    .update({ cancel_at_period_end: true })
    .eq("parent_id", user.id)
    .eq("status", "active")
    .select("current_period_end")
    .maybeSingle();

  if (error) {
    const _emsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: _emsg }, { status: 500 });
  }

  // Send cancellation confirmation email (best-effort)
  const { data: parent } = await sb.from("parents").select("email, name").eq("id", user.id).maybeSingle();
  if (parent?.email && sub?.current_period_end) {
    void sendCancellationConfirmation({
      to: parent.email,
      parentName: parent.name ?? "there",
      accessUntil: sub.current_period_end,
    });
  }

  return NextResponse.json({ ok: true });
}
