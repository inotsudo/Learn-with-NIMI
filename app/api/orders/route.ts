export const runtime = "nodejs";

// POST /api/orders — creates an order with server-authoritative pricing.
// The client sends productId + currency + optional discountCodeId; the server
// fetches the canonical price from the DB and applies the discount there.
// This prevents a user from manipulating the amount via DevTools before the
// modal initialises (previously chargeAmount was computed client-side and
// passed directly to createOrder which wrote it verbatim to the DB).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
// @ts-ignore — auth-helpers-nextjs pre-dates Next.js 15 async cookies; passing the fn works at runtime
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
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
  const authClient = createRouteHandlerClient({ cookies });
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

  // Fetch product with authoritative prices
  const { data: product } = await supabase
    .from("products")
    .select("id, price_usd, price_rwf, is_active")
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

  return NextResponse.json({ orderId: order.id, amount: Number(order.amount) });
}
