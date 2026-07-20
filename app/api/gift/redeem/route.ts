// POST /api/gift/redeem — redeem a gift subscription code
// Caller must be authenticated. The gift is activated on their account.

import { NextRequest, NextResponse } from "next/server";

type GiftProduct = { name: string | null; tier: string | null; billing_interval: string | null };
type GiftGiver = { name: string | null; email?: string | null };
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabaseRouteAuth";

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
import { sendGiftRedeemed } from "@/lib/email";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { code?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }

  const code = typeof body.code === "string" ? body.code.toUpperCase().trim() : "";
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 422 });

  // Look up the gift (include giver for redeemed notification)
  const { data: gift } = await serviceSupabase
    .from("gift_subscriptions")
    .select("*, products(name, tier, billing_interval), parents!giver_parent_id(name, email)")
    .eq("redemption_code", code)
    .maybeSingle();

  if (!gift) return NextResponse.json({ error: "Invalid redemption code" }, { status: 404 });
  // Fast-path for already-redeemed codes. The real race guard is the atomic
  // update below — this just avoids running the billing resolution work.
  if (gift.redeemed_at) return NextResponse.json({ error: "This gift has already been redeemed" }, { status: 409 });

  // Verify the order was paid (gift must be purchased before it can be redeemed)
  const { data: order } = await serviceSupabase
    .from("orders")
    .select("payment_status, amount, currency")
    .eq("id", gift.order_id)
    .maybeSingle();
  if (!order || order.payment_status !== "completed") {
    return NextResponse.json({ error: "This gift has not been paid yet" }, { status: 402 });
  }

  const product = gift.products as GiftProduct | null;

  // Flexible-amount gifts (product_id = null): map gift amount to best plan it covers.
  // Look up current club prices to determine monthly vs annual.
  let billingInterval: "month" | "year" = product?.billing_interval as "month" | "year" ?? "month";
  let resolvedProductId: string | null = gift.product_id ?? null;

  if (!gift.product_id && gift.gift_amount && gift.gift_currency) {
    const { data: plans } = await serviceSupabase
      .from("products")
      .select("id, billing_interval, price_usd, price_rwf, price_eur")
      .in("slug", ["nimipiko-club-annual", "nimipiko-club"])
      .eq("is_active", true);

    if (plans && plans.length > 0) {
      const priceField = gift.gift_currency === "RWF" ? "price_rwf"
        : gift.gift_currency === "EUR" ? "price_eur" : "price_usd";
      const annual  = plans.find(p => p.billing_interval === "year");
      const monthly = plans.find(p => p.billing_interval === "month");

      if (annual && gift.gift_amount >= (annual[priceField] ?? Infinity)) {
        billingInterval = "year";
        resolvedProductId = annual.id;
      } else {
        billingInterval = "month";
        resolvedProductId = monthly?.id ?? null;
      }
    }
  }

  const periodEnd = new Date();
  if (billingInterval === "year") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Atomically claim the gift — exactly one concurrent request can succeed here.
  // Both requests may pass the fast-path `if (gift.redeemed_at)` check above,
  // but only one will see a row returned from this update; the other gets 0 rows → 409.
  const { data: claimed } = await serviceSupabase
    .from("gift_subscriptions")
    .update({ redeemed_at: new Date().toISOString(), redeemed_by: user.id })
    .eq("id", gift.id)
    .is("redeemed_at", null)
    .select("id")
    .maybeSingle();

  if (!claimed) return NextResponse.json({ error: "This gift has already been redeemed" }, { status: 409 });

  // Create subscription for the recipient
  const { data: sub } = await serviceSupabase.from("nimipiko_subscriptions").insert({
    parent_id: user.id,
    product_id: resolvedProductId,
    status: "active",
    currency: order.currency,
    amount: order.amount,
    billing_interval: billingInterval,
    current_period_start: new Date().toISOString(),
    current_period_end: periodEnd.toISOString(),
    payment_provider: "admin_grant",
    cancel_at_period_end: true,
  }).select().single();

  if (!sub) {
    // Roll back the claim so the user can retry — otherwise the code is
    // permanently burned with no subscription to show for it.
    await serviceSupabase
      .from("gift_subscriptions")
      .update({ redeemed_at: null, redeemed_by: null })
      .eq("id", gift.id);
    return NextResponse.json({ error: "Failed to activate gift" }, { status: 500 });
  }

  // Grant content access
  const accessType = product?.tier === "club" ? "club"
    : product?.tier === "personalized" ? "personalized" : "story";

  await serviceSupabase.from("content_access").insert({
    parent_id: user.id,
    access_type: accessType,
    order_id: gift.order_id,
    subscription_id: sub.id,
  });

  // Notify the giver (best-effort, non-blocking)
  const giver = gift.parents as unknown as GiftGiver | null;
  if (giver?.email) {
    void sendGiftRedeemed({
      to: giver.email,
      giverName: giver.name ?? "there",
      recipientName: gift.recipient_name ?? null,
      recipientEmail: gift.recipient_email,
      giftAmount: gift.gift_amount ?? null,
      giftCurrency: gift.gift_currency ?? null,
    });
  }

  return NextResponse.json({
    success: true,
    productName: product?.name ?? "Nimipiko Club",
    periodEnd: periodEnd.toISOString(),
  });
}

// GET /api/gift/redeem?code=XXX — preview a gift before signing in
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase().trim() ?? "";
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 422 });

  const { data: gift } = await serviceSupabase
    .from("gift_subscriptions")
    .select("recipient_email, recipient_name, redeemed_at, gift_amount, gift_currency, message, products(name), parents!giver_parent_id(name)")
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
    giftAmount: gift.gift_amount ?? null,
    giftCurrency: gift.gift_currency ?? null,
    message: gift.message ?? null,
  });
}
