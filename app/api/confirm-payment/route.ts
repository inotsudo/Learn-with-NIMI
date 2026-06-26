import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCybersourceTransaction } from "@/lib/cybersource/verify";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function decodeJwtPayload(jwt: string): any {
  const parts = jwt.split(".");
  if (parts.length < 2) throw new Error("Invalid JWT");
  const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
  return JSON.parse(payload);
}

export async function POST(req: NextRequest) {
  try {
    const { response: completionJwt, orderId } = await req.json();

    if (!completionJwt || !orderId) {
      return NextResponse.json({ error: "Missing response or orderId" }, { status: 400 });
    }

    // Decode JWT to get transaction ID
    const payload = decodeJwtPayload(completionJwt);
    const transactionId = payload.id;

    if (!transactionId) {
      return NextResponse.json({ error: "No transaction ID in response" }, { status: 400 });
    }

    // CRITICAL: Verify server-side — never trust the JWT status alone
    const { csStatus, isAuthorized, authorizedAmount } = await verifyCybersourceTransaction(transactionId);

    // Get order from DB
    const { data: order } = await supabase
      .from("orders")
      .select("*, products(tier, story_id)")
      .eq("id", orderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Validate amount (1% tolerance for FX rounding)
    const expectedAmount = Number(order.amount);
    const actualAmount = Number(authorizedAmount);
    const tolerance = expectedAmount * 0.01;
    const amountMatch = Math.abs(expectedAmount - actualAmount) <= tolerance;

    if (isAuthorized && amountMatch) {
      // Payment successful
      await supabase.from("orders").update({
        payment_status: "completed",
        provider_transaction_id: transactionId,
        completed_at: new Date().toISOString(),
      }).eq("id", orderId);

      // Grant content access
      const product = order.products as any;
      if (product) {
        const accessType = product.tier === "club" ? "club"
          : product.tier === "personalized" ? "personalized"
          : product.tier === "champion_pack" ? "challenge_pack"
          : product.tier === "family_bundle" ? "bundle"
          : "story";

        await supabase.from("content_access").insert({
          parent_id: order.parent_id,
          access_type: accessType,
          story_id: product.story_id,
          order_id: orderId,
        });
      }

      return NextResponse.json({ success: true, status: csStatus, transactionId });
    } else {
      // Payment failed or amount mismatch
      await supabase.from("orders").update({
        payment_status: "failed",
        provider_transaction_id: transactionId,
      }).eq("id", orderId);

      return NextResponse.json({
        success: false,
        status: csStatus,
        message: !isAuthorized ? "Payment was declined" : "Amount mismatch",
      }, { status: 402 });
    }
  } catch (err: any) {
    console.error("[ConfirmPayment]", err);
    return NextResponse.json({ error: "Payment confirmation failed" }, { status: 500 });
  }
}
