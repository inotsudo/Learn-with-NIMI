// POST /api/gift/redeem — redeem a gift subscription code
// Caller must be authenticated. The gift is activated on their account.

import { NextRequest, NextResponse } from "next/server";

type GiftProduct = { name: string | null; tier: string | null; billing_interval: string | null };
type GiftGiver = { name: string | null };
import { createRouteClient } from "@/lib/supabaseRouteClient";

export async function POST(req: NextRequest) {
  const supabase = await createRouteClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { code?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }

  const code = typeof body.code === "string" ? body.code.toUpperCase().trim() : "";
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 422 });

  // Look up the gift
  const { data: gift } = await supabase
    .from("gift_subscriptions")
    .select("*, products(name, tier, billing_interval)")
    .eq("redemption_code", code)
    .maybeSingle();

  if (!gift) return NextResponse.json({ error: "Invalid redemption code" }, { status: 404 });
  if (gift.redeemed_at) return NextResponse.json({ error: "This gift has already been redeemed" }, { status: 409 });

  // Verify the order was paid (gift must be purchased before it can be redeemed)
  const { data: order } = await supabase
    .from("orders")
    .select("payment_status, amount, currency")
    .eq("id", gift.order_id)
    .maybeSingle();
  if (!order || order.payment_status !== "completed") {
    return NextResponse.json({ error: "This gift has not been paid yet" }, { status: 402 });
  }

  const product = gift.products as GiftProduct | null;
  const billingInterval = (product?.billing_interval ?? "month") as "month" | "year";
  const periodEnd = new Date();
  if (billingInterval === "year") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Create subscription for the recipient
  const { data: sub } = await supabase.from("nimipiko_subscriptions").insert({
    parent_id: user.id,
    product_id: gift.product_id,
    status: "active",
    currency: order.currency,
    amount: order.amount,
    billing_interval: billingInterval,
    current_period_start: new Date().toISOString(),
    current_period_end: periodEnd.toISOString(),
    payment_provider: "admin_grant",
    cancel_at_period_end: true, // gifts don't auto-renew
  }).select().single();

  if (!sub) return NextResponse.json({ error: "Failed to activate gift" }, { status: 500 });

  // Grant content access
  const accessType = product?.tier === "club" ? "club"
    : product?.tier === "personalized" ? "personalized" : "story";

  await supabase.from("content_access").insert({
    parent_id: user.id,
    access_type: accessType,
    order_id: gift.order_id,
    subscription_id: sub.id,
  });

  // Mark gift as redeemed
  await supabase.from("gift_subscriptions").update({
    redeemed_at: new Date().toISOString(),
    redeemed_by: user.id,
  }).eq("id", gift.id);

  return NextResponse.json({
    success: true,
    productName: product?.name ?? "Nimipiko Club",
    periodEnd: periodEnd.toISOString(),
  });
}

// GET /api/gift/redeem?code=XXX — preview a gift before signing in
export async function GET(req: NextRequest) {
  const supabase = await createRouteClient();
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase().trim() ?? "";
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 422 });

  const { data: gift } = await supabase
    .from("gift_subscriptions")
    .select("recipient_email, recipient_name, redeemed_at, products(name), parents!giver_parent_id(name)")
    .eq("redemption_code", code)
    .maybeSingle();

  if (!gift) return NextResponse.json({ error: "Invalid code" }, { status: 404 });

  const giver = (gift.parents as unknown as GiftGiver | null);
  const product = (gift.products as unknown as GiftProduct | null);

  return NextResponse.json({
    valid: !gift.redeemed_at,
    redeemed: !!gift.redeemed_at,
    recipientEmail: gift.recipient_email,
    recipientName: gift.recipient_name,
    giverName: giver?.name ?? "Someone special",
    productName: product?.name ?? "Nimipiko Club",
  });
}
