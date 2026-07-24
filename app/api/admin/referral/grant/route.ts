import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/serviceClient";
import { sendReferralRewardGranted } from "@/lib/email";
import { sendPushToParent } from "@/lib/push";

// POST /api/admin/referral/grant
// Admin action: grant a referral reward by redemption ID.
// Runs the full reward logic (subscription + content_access + notifications),
// unlike the old admin raw DB stamp that only set reward_granted_at.

export async function POST(req: NextRequest) {
  const supabase = getServiceClient();

  // Verify caller is an authenticated admin
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { createClient } = await import("@supabase/supabase-js");
  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: auth } } }
  );
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: admin } = await supabase
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as { redemption_id?: string; force?: boolean };
  const { redemption_id, force } = body;
  if (!redemption_id || typeof redemption_id !== "string") {
    return NextResponse.json({ error: "redemption_id required" }, { status: 400 });
  }

  // Load the redemption
  const { data: redemption } = await supabase
    .from("referral_redemptions")
    .select("id, referrer_id, referred_id, reward_granted_at")
    .eq("id", redemption_id)
    .maybeSingle();

  if (!redemption) {
    return NextResponse.json({ error: "Redemption not found" }, { status: 404 });
  }

  if (redemption.reward_granted_at && !force) {
    return NextResponse.json({ error: "Reward already granted" }, { status: 409 });
  }

  if (!redemption.reward_granted_at) {
    // Atomically claim — prevents double-grant if cron runs concurrently
    const { data: claimed } = await supabase
      .from("referral_redemptions")
      .update({ reward_granted_at: new Date().toISOString() })
      .eq("id", redemption_id)
      .is("reward_granted_at", null)
      .select("id")
      .maybeSingle();

    if (!claimed) {
      return NextResponse.json({ error: "Already granted (race)" }, { status: 409 });
    }
  }

  // Look up product
  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("slug", "nimipiko-club")
    .maybeSingle();

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 500 });
  }

  // Grant 1 free month to the referrer
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { data: newSub } = await supabase
    .from("nimipiko_subscriptions")
    .insert({
      parent_id: redemption.referrer_id,
      product_id: product.id,
      status: "active",
      currency: "USD",
      amount: 0,
      billing_interval: "month",
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
      payment_provider: "admin_grant",
      cancel_at_period_end: true,
    })
    .select("id")
    .single();

  await supabase.from("content_access").insert({
    parent_id: redemption.referrer_id,
    access_type: "club",
    order_id: null,
    subscription_id: newSub?.id ?? null,
    expires_at: periodEnd.toISOString(),
  });

  // Notify referrer
  const [referrerRow, refereeRow] = await Promise.all([
    supabase.from("parents").select("email, name").eq("id", redemption.referrer_id).maybeSingle(),
    supabase.from("parents").select("name").eq("id", redemption.referred_id).maybeSingle(),
  ]);

  const referrerEmail = referrerRow.data?.email;
  const referrerName  = referrerRow.data?.name ?? null;
  const refereeName   = refereeRow.data?.name ?? null;

  if (referrerEmail) {
    void sendReferralRewardGranted({
      to: referrerEmail,
      referrerName: referrerName ?? "there",
      refereeName,
      freeMonthEnd: periodEnd.toISOString(),
    }).catch(() => {});
  }

  void sendPushToParent(supabase, redemption.referrer_id, {
    title: "🎁 You earned 1 free month!",
    body: "Your referral friend just subscribed to NIMIPIKO Club. Enjoy a free month on us!",
    url: "/parents?tab=settings",
  }).catch(() => {});

  return NextResponse.json({ ok: true, period_end: periodEnd.toISOString() });
}
