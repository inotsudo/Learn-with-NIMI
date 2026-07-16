// POST /api/gift — create a gift subscription order
// Called from the gift purchase flow (same as regular checkout but with recipient_email)
// Returns { giftId, orderId } so the confirm-payment flow can finalize it.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabaseRouteAuth";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function randomCode(len = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes).map(b => chars[b % chars.length]).join("");
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    productId?: string;
    currency?: string;
    paymentProvider?: string;
    recipientEmail?: string;
    recipientName?: string;
    message?: string;
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }

  if (!body.productId || !body.currency || !body.recipientEmail) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 422 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(body.recipientEmail)) {
    return NextResponse.json({ error: "Invalid recipient email address" }, { status: 422 });
  }

  // Fetch product with authoritative prices — never trust client-supplied amount
  const { data: product } = await supabase
    .from("products")
    .select("id, name, tier, billing_interval, price_usd, price_rwf")
    .eq("id", body.productId)
    .eq("is_active", true)
    .maybeSingle();
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const authorizedAmount = body.currency === "RWF" ? product.price_rwf : product.price_usd;
  if (authorizedAmount == null) {
    return NextResponse.json({ error: "Currency not supported for this product" }, { status: 422 });
  }

  // Create the order
  const { data: order, error: orderErr } = await supabase.from("orders").insert({
    parent_id: user.id,
    product_id: body.productId,
    currency: body.currency,
    amount: authorizedAmount,
    payment_provider: body.paymentProvider ?? "cybersource",
    payment_status: "pending",
    personalization_data: {
      gift: true,
      recipient_email: body.recipientEmail,
      recipient_name: body.recipientName ?? null,
      message: body.message ?? null,
    },
  }).select().single();
  if (orderErr || !order) {
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }

  // Create the gift_subscriptions record (pending redemption)
  const code = randomCode(12);
  const { data: gift, error: giftErr } = await supabase.from("gift_subscriptions").insert({
    giver_parent_id: user.id,
    recipient_email: body.recipientEmail,
    recipient_name: body.recipientName ?? null,
    product_id: body.productId,
    order_id: order.id,
    redemption_code: code,
    message: body.message ?? null,
  }).select().single();
  if (giftErr || !gift) {
    return NextResponse.json({ error: "Failed to create gift record" }, { status: 500 });
  }

  return NextResponse.json({ giftId: gift.id, orderId: order.id, code });
}
