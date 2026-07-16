export const runtime = "nodejs";

// POST /api/orders — creates an order with server-authoritative pricing.
// The client sends productId + currency + optional discountCodeId; the server
// fetches the canonical price from the DB and applies the discount there.
// This prevents a user from manipulating the amount via DevTools before the
// modal initialises (previously chargeAmount was computed client-side and
// passed directly to createOrder which wrote it verbatim to the DB).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createRouteClient } from "@/lib/supabaseRouteClient";
import type { Currency } from "@/lib/payments/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function priceForCurrency(product: { price_usd: number | null; price_rwf: number | null }, currency: Currency): number | null {
  return currency === "RWF" ? product.price_rwf : product.price_usd;
}

function applyDiscount(amount: number, type: "percent" | "fixed", value: number): number {
  if (type === "percent") return Math.max(0, amount * (1 - value / 100));
  return Math.max(0, amount - value);
}

export async function POST(req: NextRequest) {
  const authClient = await createRouteClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    productId?: string;
    currency?: string;
    paymentProvider?: string;
    discountCodeId?: string;
    personalizationData?: Record<string, unknown>;
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }

  const { productId, currency, paymentProvider, discountCodeId } = body;
  if (!productId || !currency || !paymentProvider) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 422 });
  }

  // Fetch product with authoritative prices and tier info for free-order provisioning
  const { data: product } = await supabase
    .from("products")
    .select("id, price_usd, price_rwf, is_active, tier, story_id, product_type, billing_interval")
    .eq("id", productId)
    .eq("is_active", true)
    .maybeSingle();
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const baseAmount = priceForCurrency(product, currency as Currency);
  if (baseAmount == null) {
    return NextResponse.json({ error: "Currency not supported for this product" }, { status: 422 });
  }

  // Apply discount server-side — re-validate to prevent replay of expired codes
  let finalAmount = baseAmount;
  let resolvedDiscountCodeId: string | null = discountCodeId ?? null;
  if (discountCodeId) {
    const { data: dc } = await supabase
      .from("discount_codes")
      .select("id, discount_type, discount_value, max_uses, uses_count, is_active")
      .eq("id", discountCodeId)
      .eq("is_active", true)
      .maybeSingle();
    if (dc && (dc.max_uses === null || dc.uses_count < dc.max_uses)) {
      finalAmount = applyDiscount(baseAmount, dc.discount_type as "percent" | "fixed", Number(dc.discount_value));
    } else {
      // Code invalid or exhausted — charge full price, clear the discount id
      resolvedDiscountCodeId = null;
    }
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      parent_id: user.id,
      product_id: productId,
      currency,
      amount: finalAmount,
      payment_provider: paymentProvider,
      payment_status: finalAmount === 0 ? "completed" : "pending",
      personalization_data: {
        ...(body.personalizationData ?? {}),
        ...(resolvedDiscountCodeId ? { discount_code_id: resolvedDiscountCodeId } : {}),
      },
      completed_at: finalAmount === 0 ? new Date().toISOString() : null,
    })
    .select("id, amount")
    .single();

  if (orderErr || !order) {
    console.error("[/api/orders]", orderErr?.message);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }

  // Zero-amount orders are immediately completed — provision access now.
  // The confirm-payment / mtn-momo flow is never called for these.
  if (finalAmount === 0) {
    const accessType = product.tier === "club" ? "club"
      : product.tier === "personalized" ? "personalized"
      : product.tier === "champion_pack" ? "challenge_pack"
      : product.tier === "family_bundle" ? "bundle"
      : "story";

    if (product.product_type === "subscription" || product.tier === "club") {
      const billingInterval = (product.billing_interval ?? "month") as "month" | "year";
      const periodEnd = new Date();
      if (billingInterval === "year") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      else periodEnd.setMonth(periodEnd.getMonth() + 1);

      const { error: provisionErr } = await supabase.rpc("provision_subscription", {
        p_parent_id:        user.id,
        p_product_id:       productId,
        p_order_id:         order.id,
        p_provider:         paymentProvider,
        p_token:            null,
        p_phone:            null,
        p_amount:           0,
        p_currency:         currency,
        p_billing_interval: billingInterval,
        p_period_start:     new Date().toISOString(),
        p_period_end:       periodEnd.toISOString(),
        p_access_type:      accessType,
        p_story_id:         product.story_id ?? null,
      });
      if (provisionErr) {
        console.error("[/api/orders] free subscription provision failed:", provisionErr.message);
      }
    } else {
      const { error: accessErr } = await supabase.from("content_access").insert({
        parent_id: user.id,
        access_type: accessType,
        story_id: product.story_id ?? null,
        order_id: order.id,
      });
      if (accessErr) {
        console.error("[/api/orders] free content_access insert failed:", accessErr.message);
      }
    }

    // Track discount redemption
    if (resolvedDiscountCodeId) {
      await Promise.all([
        supabase.from("discount_redemptions").insert({
          code_id: resolvedDiscountCodeId,
          parent_id: user.id,
          order_id: order.id,
        }),
        supabase.rpc("try_increment_discount_uses", { code_id_param: resolvedDiscountCodeId }),
      ]);
    }
  }

  return NextResponse.json({ orderId: order.id, amount: Number(order.amount) });
}
