export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCybersourceTransaction } from "@/lib/cybersource/verify";
import { sendPaymentReceipt, sendGiftNotification, sendGiftConfirmation } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { response: completeJwt, amount, orderId } = body;

    if (!completeJwt || !orderId) {
      return NextResponse.json({ success: false, message: "Missing fields." }, { status: 400 });
    }

    // Decode JWT to get transaction ID
    const segments = completeJwt.split(".");
    if (segments.length !== 3) {
      return NextResponse.json({ success: false, message: "Invalid JWT." }, { status: 400 });
    }
    const payload = JSON.parse(Buffer.from(segments[1], "base64url").toString("utf8"));
    const transactionId = payload.id as string | undefined;

    if (!transactionId) {
      return NextResponse.json({ success: false, message: "Missing transaction ID." }, { status: 400 });
    }

    // VERIFY WITH CYBERSOURCE — never trust the JWT alone
    let csStatus: string;
    let isAuthorized: boolean;
    let authorizedAmount: number;
    try {
      ({ csStatus, isAuthorized, authorizedAmount } = await verifyCybersourceTransaction(transactionId));
    } catch (verifyErr: any) {
      console.error("[ConfirmPayment] Verify failed:", verifyErr.message);
      return NextResponse.json(
        { success: false, message: "Could not verify payment with gateway." },
        { status: 502 }
      );
    }

    // Get order from DB
    const { data: order } = await supabase
      .from("orders")
      .select("*, products(tier, story_id, billing_interval)")
      .eq("id", orderId)
      .single();

    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
    }

    // Validate amount (1% tolerance for FX rounding)
    const expectedAmount = Number(order.amount);
    if (authorizedAmount > 0 && authorizedAmount < expectedAmount * 0.99) {
      return NextResponse.json(
        { success: false, message: "Payment amount mismatch." },
        { status: 402 }
      );
    }

    if (isAuthorized) {
      await supabase.from("orders").update({
        payment_status: "completed",
        provider_transaction_id: transactionId,
        completed_at: new Date().toISOString(),
      }).eq("id", orderId);

      const product = order.products as any;
      if (product) {
        const accessType = product.tier === "club" ? "club"
          : product.tier === "personalized" ? "personalized"
          : product.tier === "champion_pack" ? "challenge_pack"
          : product.tier === "family_bundle" ? "bundle"
          : "story";

        // For subscriptions — create subscription record + save payment method
        if (product.product_type === "subscription" || product.tier === "club") {
          // Save CyberSource payment instrument for auto-renewal
          const { data: pm } = await supabase.from("payment_methods").insert({
            parent_id: order.parent_id,
            provider: "cybersource",
            token: transactionId,
            is_default: true,
          }).select().single();

          const billingInterval = (product.billing_interval ?? "month") as "month" | "year";
          const periodEnd = new Date();
          if (billingInterval === "year") {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          }

          const { data: sub } = await supabase.from("nimipiko_subscriptions").insert({
            parent_id: order.parent_id,
            product_id: order.product_id,
            status: "active",
            currency: order.currency,
            amount: order.amount,
            billing_interval: billingInterval,
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString(),
            payment_provider: "cybersource",
            payment_method_id: pm?.id ?? null,
          }).select().single();

          await supabase.from("content_access").insert({
            parent_id: order.parent_id,
            access_type: accessType,
            story_id: product.story_id,
            order_id: orderId,
            subscription_id: sub?.id ?? null,
          });

          // Fire referral reward (best-effort, non-blocking)
          void fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://nimipiko.com"}/api/referral/reward`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-cron-secret": process.env.CRON_SECRET ?? "" },
            body: JSON.stringify({ referred_id: order.parent_id }),
          }).catch(() => {});

          // Track discount code redemption if one was applied
          const discountCodeId = (order.personalization_data as any)?.discount_code_id;
          if (discountCodeId) {
            await Promise.all([
              supabase.from("discount_redemptions").insert({
                code_id: discountCodeId,
                parent_id: order.parent_id,
                order_id: orderId,
              }).then(() => {}),
              supabase.rpc("increment_discount_uses", { code_id_param: discountCodeId }).then(() => {}),
            ]);
          }

          // Send emails (best-effort)
          const { data: parent } = await supabase
            .from("parents")
            .select("email, name")
            .eq("id", order.parent_id)
            .maybeSingle();

          const isGift = (order.personalization_data as any)?.gift === true;
          if (isGift) {
            // Send gift notification to recipient + confirmation to giver
            const pd = order.personalization_data as any;
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nimipiko.com";
            const { data: giftRecord } = await supabase
              .from("gift_subscriptions")
              .select("redemption_code, recipient_email, recipient_name, message")
              .eq("order_id", orderId)
              .maybeSingle();
            if (giftRecord) {
              void sendGiftNotification({
                to: giftRecord.recipient_email,
                recipientName: giftRecord.recipient_name ?? null,
                giverName: parent?.name ?? "Someone special",
                productName: (product as any).name ?? "Nimipiko Club",
                message: giftRecord.message ?? null,
                redeemUrl: `${siteUrl}/gift/redeem?code=${giftRecord.redemption_code}`,
              });
              if (parent?.email) {
                void sendGiftConfirmation({
                  to: parent.email,
                  giverName: parent.name ?? "there",
                  recipientEmail: giftRecord.recipient_email,
                  productName: (product as any).name ?? "Nimipiko Club",
                });
              }
            }
          } else if (parent?.email) {
            void sendPaymentReceipt({
              to: parent.email,
              parentName: parent.name ?? "there",
              amount: String(order.amount),
              currency: order.currency,
              provider: "cybersource",
              periodEnd: periodEnd.toISOString(),
            });
          }
        } else {
          await supabase.from("content_access").insert({
            parent_id: order.parent_id,
            access_type: accessType,
            story_id: product.story_id,
            order_id: orderId,
          });
        }
      }

      return NextResponse.json({ success: true, status: "SUCCESS", transactionId });
    }

    // Declined
    await supabase.from("orders").update({
      payment_status: "failed",
      provider_transaction_id: transactionId,
    }).eq("id", orderId);

    return NextResponse.json(
      { success: false, status: csStatus, message: payload.message || "Transaction declined." },
      { status: 402 }
    );
  } catch (err: any) {
    console.error("[ConfirmPayment]", err);
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}
