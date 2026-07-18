export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";

type OrderProduct = { tier: string | null; story_id: string | null; billing_interval: string | null; product_type: string | null; name: string | null };
type PersonalizationData = { discount_code_id?: string; gift?: boolean };
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabaseRouteAuth";
import { verifyCybersourceTransaction } from "@/lib/cybersource/verify";
import { sendPaymentReceipt, sendGiftNotification, sendGiftConfirmation } from "@/lib/email";

// Shared helper used by confirm-payment (immediate) and the send-gift-emails cron (scheduled).
// Checks send_at: if null or in the past, fires email + marks email_sent_at.
// If send_at is in the future, skips — cron will handle it.
export async function dispatchGiftEmail(
  supabase: SupabaseClient,
  orderId: string,
  parent: { email?: string; name?: string } | null,
  productName: string | null,
): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nimipiko.com";
  const { data: gift } = await supabase
    .from("gift_subscriptions")
    .select("id, redemption_code, recipient_email, recipient_name, message, send_at, email_sent_at, gift_amount, gift_currency")
    .eq("order_id", orderId)
    .maybeSingle();
  if (!gift || gift.email_sent_at) return; // already sent

  const now = new Date();
  const sendAt = gift.send_at ? new Date(gift.send_at) : null;
  if (sendAt && sendAt > now) return; // scheduled for the future — cron handles it

  void sendGiftNotification({
    to: gift.recipient_email,
    recipientName: gift.recipient_name ?? null,
    giverName: parent?.name ?? "Someone special",
    productName,
    giftAmount: gift.gift_amount ?? null,
    giftCurrency: gift.gift_currency ?? null,
    message: gift.message ?? null,
    redeemUrl: `${siteUrl}/gift/redeem?code=${gift.redemption_code}`,
  });
  if (parent?.email) {
    void sendGiftConfirmation({
      to: parent.email,
      giverName: parent.name ?? "there",
      recipientEmail: gift.recipient_email,
      productName,
      giftAmount: gift.gift_amount ?? null,
      giftCurrency: gift.gift_currency ?? null,
    });
  }
  await supabase.from("gift_subscriptions")
    .update({ email_sent_at: now.toISOString() })
    .eq("id", gift.id);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Auth check — caller must be the parent who owns the order
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { response: completeJwt, orderId } = body;

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
    let customerToken: string | null;
    try {
      ({ csStatus, isAuthorized, authorizedAmount, customerToken } = await verifyCybersourceTransaction(transactionId));
    } catch (verifyErr: unknown) {
      const _vmsg = verifyErr instanceof Error ? verifyErr.message : String(verifyErr);
      console.error("[ConfirmPayment] Verify failed:", _vmsg);
      return NextResponse.json(
        { success: false, message: "Could not verify payment with gateway." },
        { status: 502 }
      );
    }

    // Get order from DB
    const { data: order } = await supabase
      .from("orders")
      .select("*, products(tier, story_id, billing_interval, product_type, name)")
      .eq("id", orderId)
      .single();

    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
    }

    // Owner check — prevents user A confirming user B's order
    if (order.parent_id !== user.id) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    // Idempotency — if already completed (e.g. client retry on network timeout) return success immediately.
    if (order.payment_status === "completed") {
      return NextResponse.json({ success: true, status: "SUCCESS", transactionId: order.provider_transaction_id });
    }

    // Validate amount (1% tolerance for FX rounding).
    // Do NOT short-circuit when authorizedAmount is 0 — a zero response from
    // CyberSource (network glitch, test-mode quirk) must still fail this check.
    const expectedAmount = Number(order.amount);
    if (authorizedAmount < expectedAmount * 0.99) {
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

      const product = order.products as OrderProduct | null;
      if (product) {
        const accessType = product.tier === "club" ? "club"
          : product.tier === "personalized" ? "personalized"
          : product.tier === "champion_pack" ? "challenge_pack"
          : product.tier === "family_bundle" ? "bundle"
          : "story";

        // For subscriptions — atomically provision payment_method + subscription + content_access.
        if (product.product_type === "subscription" || product.tier === "club") {
          const billingInterval = (product.billing_interval ?? "month") as "month" | "year";
          const periodEnd = new Date();
          if (billingInterval === "year") {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          }

          // customerToken is the reusable CyberSource customer ID for recurring charges.
          // Requires Token Management Service (TMS) to be enabled in Business Center →
          // Payment Configuration → Tokenization. Without it, auto-renewal is impossible
          // — we store null so the renewal cron skips gracefully rather than sending a
          // useless transaction ID that CyberSource will reject.
          const tokenToStore = customerToken ?? null;
          if (!customerToken) {
            console.error(
              "[ConfirmPayment] CRITICAL: No customer token from CyberSource — auto-renewal disabled.",
              JSON.stringify({
                orderId,
                parentId: order.parent_id,
                transactionId,
                action: "Enable Token Management Service in CyberSource Business Center → Payment Configuration → Tokenization",
              })
            );
          }

          const { error: provisionErr } = await supabase.rpc("provision_subscription", {
            p_parent_id:        order.parent_id,
            p_product_id:       order.product_id,
            p_order_id:         orderId,
            p_provider:         "cybersource",
            p_token:            tokenToStore,
            p_phone:            null,
            p_amount:           Number(order.amount),
            p_currency:         order.currency,
            p_billing_interval: billingInterval,
            p_period_start:     new Date().toISOString(),
            p_period_end:       periodEnd.toISOString(),
            p_access_type:      accessType,
            p_story_id:         product.story_id ?? null,
          });

          if (provisionErr) {
            console.error("[ConfirmPayment] provision_subscription failed:", provisionErr.message);
            return NextResponse.json({ success: false, message: "Failed to activate subscription." }, { status: 500 });
          }

          // Fire referral reward (best-effort, non-blocking)
          void fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://nimipiko.com"}/api/referral/reward`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-cron-secret": process.env.CRON_SECRET ?? "" },
            body: JSON.stringify({ referred_id: order.parent_id }),
          }).catch(() => {});

          // Track discount code redemption — atomic CAS update prevents over-redemption
          // if two orders with the same code reached payment simultaneously.
          const discountCodeId = (order.personalization_data as PersonalizationData | null)?.discount_code_id;
          if (discountCodeId) {
            const [, { data: incremented }] = await Promise.all([
              supabase.from("discount_redemptions").insert({
                code_id: discountCodeId,
                parent_id: order.parent_id,
                order_id: orderId,
              }),
              supabase.rpc("try_increment_discount_uses", { code_id_param: discountCodeId }),
            ]);
            // Payment already succeeded — log but don't block. The user legitimately
            // had a valid code when ordering; an over-redemption race is an ops concern.
            if (!incremented) {
              console.error(
                "[ConfirmPayment] Discount over-redemption detected.",
                JSON.stringify({ discountCodeId, orderId, parentId: order.parent_id })
              );
            }
          }

          // Send emails (best-effort)
          const { data: parent } = await supabase
            .from("parents")
            .select("email, name")
            .eq("id", order.parent_id)
            .maybeSingle();

          const isGift = (order.personalization_data as PersonalizationData | null)?.gift === true;
          if (isGift) {
            await dispatchGiftEmail(supabase, orderId, parent, product?.name ?? null);
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

      // Flexible-amount gifts have no product — handle email here
      if (!product) {
        const isFlexibleGift = (order.personalization_data as PersonalizationData | null)?.gift === true;
        if (isFlexibleGift) {
          const { data: giver } = await supabase
            .from("parents").select("email, name").eq("id", order.parent_id).maybeSingle();
          await dispatchGiftEmail(supabase, orderId, giver, null);
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
  } catch (err: unknown) {
    console.error("[ConfirmPayment]", err);
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}
