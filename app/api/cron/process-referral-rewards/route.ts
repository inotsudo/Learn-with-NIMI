import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToParent } from "@/lib/push";
import { sendReferralRewardGranted } from "@/lib/email";

// Cron fallback: finds referral redemptions where the referred user now has an
// active paid subscription but the reward was never granted (e.g. the real-time
// call from confirm-payment failed). Runs once daily.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: Request) {
  const secret = req.headers.get("authorization");
  if (!secret || secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find all unrewarded redemptions
  const { data: pending } = await supabase
    .from("referral_redemptions")
    .select("id, referrer_id, referred_id")
    .is("reward_granted_at", null);

  if (!pending || pending.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("slug", "nimipiko-club")
    .maybeSingle();

  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 500 });

  let processed = 0;

  for (const row of pending) {
    // Check if referred user has an active paid subscription
    const { data: sub } = await supabase
      .from("nimipiko_subscriptions")
      .select("id")
      .eq("parent_id", row.referred_id)
      .eq("status", "active")
      .not("payment_provider", "eq", "admin_grant")
      .maybeSingle();

    if (!sub) continue;

    // Atomically claim the reward slot
    const { data: claimed } = await supabase
      .from("referral_redemptions")
      .update({ reward_granted_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("reward_granted_at", null)
      .select("id")
      .maybeSingle();

    if (!claimed) continue;

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const { data: newSub } = await supabase.from("nimipiko_subscriptions").insert({
      parent_id: row.referrer_id,
      product_id: product.id,
      status: "active",
      currency: "USD",
      amount: 0,
      billing_interval: "month",
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
      payment_provider: "admin_grant",
      cancel_at_period_end: true,
    }).select("id").single();

    await supabase.from("content_access").insert({
      parent_id: row.referrer_id,
      access_type: "club",
      order_id: null,
      subscription_id: newSub?.id ?? null,
      expires_at: periodEnd.toISOString(),
    });

    // Look up referrer + referee for notifications
    const [referrerRow, refereeRow] = await Promise.all([
      supabase.from("parents").select("email, name").eq("id", row.referrer_id).maybeSingle(),
      supabase.from("parents").select("name").eq("id", row.referred_id).maybeSingle(),
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

    void sendPushToParent(supabase, row.referrer_id, {
      title: "🎁 You earned 1 free month!",
      body: "Your referral friend just subscribed to NIMIPIKO Club. Enjoy a free month on us!",
      url: "/parents?tab=settings",
    }).catch(() => {});

    processed++;
  }

  return NextResponse.json({ processed });
}
