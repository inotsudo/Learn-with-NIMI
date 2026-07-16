import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Called internally (from confirm-payment and mtn-momo) after a Club sub is created.
// Grants the referrer 1 free month if their referred user just subscribed.
// Authorization: CRON_SECRET header (same pattern as the renewal cron).

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
  const { referred_id } = await req.json() as { referred_id: string };

  // Validate referred_id is a real parent (prevents arbitrary free sub grants if secret leaks)
  if (!referred_id || typeof referred_id !== "string") {
    return NextResponse.json({ error: "Invalid referred_id" }, { status: 400 });
  }
  const { data: parentCheck } = await supabase
    .from("parents")
    .select("id")
    .eq("id", referred_id)
    .maybeSingle();
  if (!parentCheck) {
    return NextResponse.json({ error: "Invalid referred_id" }, { status: 400 });
  }

  // Find the referral record for this new subscriber
  const { data: redemption } = await supabase
    .from("referral_redemptions")
    .select("id, referrer_id")
    .eq("referred_id", referred_id)
    .maybeSingle();

  if (!redemption) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Atomically claim the reward slot — prevents concurrent triggers from granting twice.
  const { data: claimed } = await supabase
    .from("referral_redemptions")
    .update({ reward_granted_at: new Date().toISOString() })
    .eq("id", redemption.id)
    .is("reward_granted_at", null)
    .select("id")
    .maybeSingle();

  if (!claimed) {
    // Another request already granted the reward
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Grant referrer 1 free month as an admin_grant subscription
  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("slug", "nimipiko-club")
    .maybeSingle();

  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 500 });

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await supabase.from("nimipiko_subscriptions").insert({
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
  });

  await supabase.from("content_access").insert({
    parent_id: redemption.referrer_id,
    access_type: "club",
    order_id: null,
  });

  return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[referral/reward] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
