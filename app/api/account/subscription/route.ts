export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabaseRouteAuth";
import { sendCancellationConfirmation, sendReactivationConfirmation } from "@/lib/email";
import { getServiceClient } from "@/lib/supabase/serviceClient";



// GET — return the caller's active subscription (or 404)
export async function GET(req: NextRequest) {
  const supabase = getServiceClient();
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("nimipiko_subscriptions")
    .select("*")
    .eq("parent_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: "No active subscription" }, { status: 404 });
  return NextResponse.json(data);
}

// PATCH — cancel (at period end) or reactivate
// Body: { action: "cancel" | "reactivate" }
export async function PATCH(req: NextRequest) {
  const supabase = getServiceClient();
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { action?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }
  const action = body.action;
  if (action !== "cancel" && action !== "reactivate") {
    return NextResponse.json({ error: "action must be 'cancel' or 'reactivate'" }, { status: 400 });
  }

  // Only allow cancelling non-trial subscriptions (trial just expires naturally)
  const { data: sub } = await supabase
    .from("nimipiko_subscriptions")
    .select("id, payment_provider, current_period_end")
    .eq("parent_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub) return NextResponse.json({ error: "No active subscription" }, { status: 404 });
  if (sub.payment_provider === "trial") {
    return NextResponse.json({ error: "Trial subscriptions expire automatically" }, { status: 400 });
  }

  const { error } = await supabase
    .from("nimipiko_subscriptions")
    .update({ cancel_at_period_end: action === "cancel" })
    .eq("id", sub.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send confirmation emails (fire-and-forget)
  if (sub.current_period_end) {
    const [{ data: authUser }, { data: parent }] = await Promise.all([
      supabase.auth.admin.getUserById(user.id),
      supabase.from("parents").select("name").eq("id", user.id).maybeSingle(),
    ]);
    const email = authUser?.user?.email;
    if (email) {
      const parentName = (parent?.name as string | null) ?? "there";
      if (action === "cancel") {
        void sendCancellationConfirmation({ to: email, parentName, accessUntil: sub.current_period_end as string });
      } else {
        void sendReactivationConfirmation({ to: email, parentName, renewsOn: sub.current_period_end as string });
      }
    }
  }

  return NextResponse.json({ ok: true, cancel_at_period_end: action === "cancel" });
}
