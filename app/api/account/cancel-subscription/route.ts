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

  let body: { subscriptionId?: string } = {};
  try { body = await req.json(); } catch { /* no body is fine */ }

  const subscriptionId = body.subscriptionId;
  if (!subscriptionId) {
    return NextResponse.json({ error: "subscriptionId required" }, { status: 422 });
  }

  // Mark cancel_at_period_end so the renewal cron skips it.
  // Filter by id + parent_id so a user can only cancel their own subscription,
  // and exactly one row is targeted — never all active subscriptions at once.
  const { data: sub, error } = await sb
    .from("nimipiko_subscriptions")
    .update({ cancel_at_period_end: true })
    .eq("id", subscriptionId)
    .eq("parent_id", user.id)
    .eq("status", "active")
    .select("current_period_end")
    .maybeSingle();

  if (error) {
    console.error("[CancelSubscription]", error);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }

  if (!sub) {
    return NextResponse.json({ error: "Subscription not found or already cancelled" }, { status: 404 });
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
