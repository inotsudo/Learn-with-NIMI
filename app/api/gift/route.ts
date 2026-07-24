// POST /api/gift — create a flexible-amount gift
// Giver chooses any amount; no product required.
// Returns { giftId, orderId, code } so the confirm-payment flow can finalize it.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabaseRouteAuth";
import { rwfToUsd } from "@/lib/payments/rwfConvert";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Fallback minimums — overridden by the actual monthly plan price at runtime
const FALLBACK_MINIMUMS: Record<string, number> = { USD: 14.99, EUR: 13.99, RWF: 9900 };

function randomCode(len = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes).map(b => chars[b % chars.length]).join("");
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    amount?: number;
    currency?: string;
    paymentProvider?: string;
    recipientEmail?: string;
    recipientName?: string;
    message?: string;
    sendAt?: string; // ISO date string; null/absent = send immediately on payment
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }

  if (!body.amount || !body.currency) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 422 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (body.recipientEmail && !emailRegex.test(body.recipientEmail)) {
    return NextResponse.json({ error: "Invalid recipient email address" }, { status: 422 });
  }

  const currency = body.currency as "USD" | "EUR" | "RWF";

  // Derive minimum from the actual monthly Club price so gifts always cover at least 1 month
  const priceField = currency === "RWF" ? "price_rwf" : currency === "EUR" ? "price_eur" : "price_usd";
  const { data: monthlyPlan } = await supabase
    .from("products")
    .select(priceField)
    .eq("slug", "nimipiko-club")
    .eq("is_active", true)
    .maybeSingle();
  const minimum: number = (monthlyPlan as Record<string, number> | null)?.[priceField] ?? FALLBACK_MINIMUMS[currency] ?? 14.99;

  if (body.amount < minimum) {
    const minFmt = currency === "RWF"
      ? `${Math.round(minimum).toLocaleString()} RWF`
      : currency === "EUR" ? `€${minimum.toFixed(2)}` : `$${minimum.toFixed(2)}`;
    return NextResponse.json(
      { error: `Minimum gift is ${minFmt} — enough to unlock 1 month of Nimipiko Club` },
      { status: 422 }
    );
  }

  // Rwanda card: charge in USD equivalent so CyberSource can process it
  const isRwandaCard = currency === "RWF" && body.paymentProvider === "cybersource";
  const chargeCurrency = isRwandaCard ? "USD" : currency;
  const chargeAmount   = isRwandaCard ? rwfToUsd(body.amount) : body.amount;

  // Create order (no product_id — this is a pure monetary gift)
  const { data: order, error: orderErr } = await supabase.from("orders").insert({
    parent_id: user.id,
    product_id: null,
    currency: chargeCurrency,
    amount: chargeAmount,
    payment_provider: body.paymentProvider ?? "cybersource",
    payment_status: "pending",
    personalization_data: {
      gift: true,
      gift_amount: body.amount,
      gift_currency: currency,
      recipient_email: body.recipientEmail,
      recipient_name: body.recipientName ?? null,
      message: body.message ?? null,
    },
  }).select().single();
  if (orderErr || !order) {
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }

  // Validate sendAt if provided — must be a future date within 1 year
  let sendAt: string | null = null;
  if (body.sendAt) {
    const d = new Date(body.sendAt);
    const now = new Date();
    const maxDate = new Date(); maxDate.setFullYear(maxDate.getFullYear() + 1);
    if (isNaN(d.getTime()) || d <= now || d > maxDate) {
      return NextResponse.json({ error: "Invalid send date" }, { status: 422 });
    }
    sendAt = d.toISOString();
  }

  // Create gift record (product_id is null — redeemer picks plan at redemption)
  const code = randomCode(12);
  const { data: gift, error: giftErr } = await supabase.from("gift_subscriptions").insert({
    giver_parent_id: user.id,
    recipient_email: body.recipientEmail,
    recipient_name: body.recipientName ?? null,
    product_id: null,
    order_id: order.id,
    redemption_code: code,
    message: body.message ?? null,
    gift_amount: body.amount,
    gift_currency: currency,
    send_at: sendAt,
  }).select().single();
  if (giftErr || !gift) {
    return NextResponse.json({ error: "Failed to create gift record" }, { status: 500 });
  }

  return NextResponse.json({ giftId: gift.id, orderId: order.id, code });
}
