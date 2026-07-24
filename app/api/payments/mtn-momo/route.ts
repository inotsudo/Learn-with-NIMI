import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabaseRouteAuth";
import { v4 as uuidv4 } from "uuid";

type OrderProduct = { tier: string | null; story_id: string | null; billing_interval: string | null; product_type: string | null; name: string | null };
type PersonalizationData = { discount_code_id?: string; gift?: boolean; phone?: string };
import { sendPaymentReceipt, sendGiftNotification, sendGiftConfirmation, sendWelcomeToClub } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MOMO_TOKEN_URL = process.env.MTN_REQUEST_TOKEN_ENDPOINT!;
const MOMO_REQUEST_TO_PAY_URL = process.env.MTN_REQUEST_TO_PAY_ENDPOINT!;
const MOMO_STATUS_URL = process.env.MTN_TRANSACTION_STATUS_ENDPOINT!;
const MOMO_API_USER = process.env.MOMO_API_USER!;
const MOMO_API_KEY = process.env.MOMO_API_KEY!;
const MOMO_SUBSCRIPTION_KEY = process.env.MOMO_COLLECTION_ACTIVE_KEY!;
const MOMO_TARGET_ENV = process.env.MOMO_TARGET_ENVIRONMENT || "mtnrwanda";

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(`${MOMO_API_USER}:${MOMO_API_KEY}`).toString("base64");
  const res = await fetch(MOMO_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY,
    },
  });
  if (!res.ok) throw new Error(`MoMo token error: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

// POST — initiate payment request
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, phoneNumber } = body;

    if (!orderId || !phoneNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
    if (!order || order.payment_status !== "pending") {
      return NextResponse.json({ error: "Invalid order" }, { status: 400 });
    }
    if (order.parent_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await supabase.from("orders").update({ payment_status: "processing" }).eq("id", orderId);

    const token = await getAccessToken();
    const referenceId = uuidv4();

    // Clean phone number — ensure format 25078XXXXXXX
    let phone = phoneNumber.replace(/[\s\-+]/g, "");
    if (phone.startsWith("0")) phone = "250" + phone.slice(1);
    if (!phone.startsWith("250")) phone = "250" + phone;

    const res = await fetch(MOMO_REQUEST_TO_PAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Reference-Id": referenceId,
        "X-Target-Environment": MOMO_TARGET_ENV,
        "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Always use DB amount — never trust client-supplied value.
        amount: String(Math.round(Number(order.amount))),
        currency: "RWF",
        externalId: orderId,
        payer: { partyIdType: "MSISDN", partyId: phone },
        payerMessage: "Nimipiko Purchase",
        payeeNote: `Order ${orderId}`,
      }),
    });

    if (res.status === 202) {
      // MoMo accepted — save reference for polling
      await supabase.from("orders").update({
        payment_ref: referenceId,
      }).eq("id", orderId);

      return NextResponse.json({ success: true, referenceId, message: "Payment request sent to your phone" });
    } else {
      const errBody = await res.text();
      console.error("[MTN MoMo] Request failed:", res.status, errBody);
      await supabase.from("orders").update({ payment_status: "failed" }).eq("id", orderId);
      return NextResponse.json({ error: "MoMo payment request failed" }, { status: 400 });
    }
  } catch (err: unknown) {
    console.error("[MTN MoMo]", err);
    return NextResponse.json({ error: "Payment processing error" }, { status: 500 });
  }
}

// GET — check payment status
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    const referenceId = searchParams.get("referenceId");

    if (!orderId || !referenceId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const { data: order } = await supabase.from("orders").select("payment_ref, parent_id").eq("id", orderId).maybeSingle();
    if (!order || order.payment_ref !== referenceId) {
      return NextResponse.json({ error: "Invalid reference" }, { status: 400 });
    }
    if (order.parent_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const token = await getAccessToken();
    const statusUrl = MOMO_STATUS_URL.replace("{referenceId}", referenceId);
    const res = await fetch(statusUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Target-Environment": MOMO_TARGET_ENV,
        "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ status: "pending" });
    }

    const data = await res.json();

    if (data.status === "SUCCESSFUL") {
      // Atomic CAS claim: only the first concurrent request succeeds.
      // Subsequent polls see no row returned (payment_status already 'completed')
      // and return the idempotent success response immediately.
      const { data: claimedOrder } = await supabase
        .from("orders")
        .update({
          payment_status: "completed",
          provider_transaction_id: data.financialTransactionId ?? referenceId,
          completed_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("payment_status", "processing") // guard: only claim from 'processing' state
        .select("*, products(tier, story_id, billing_interval, name)")
        .maybeSingle();

      if (!claimedOrder) {
        // Another request already completed this order — return idempotent success.
        return NextResponse.json({ status: "completed" });
      }

      {
        const order = claimedOrder;

        const product = order.products as OrderProduct | null;
        if (product) {
          const accessType = product.tier === "club" ? "club"
            : product.tier === "personalized" ? "personalized"
            : product.tier === "champion_pack" ? "challenge_pack"
            : product.tier === "family_bundle" ? "bundle"
            : "story";

          if (product.product_type === "subscription" || product.tier === "club") {
            const phone = order.personalization_data?.phone ?? null;
            const billingInterval = (product.billing_interval ?? "month") as "month" | "year";
            const periodEnd = new Date();
            if (billingInterval === "year") {
              periodEnd.setFullYear(periodEnd.getFullYear() + 1);
            } else {
              periodEnd.setMonth(periodEnd.getMonth() + 1);
            }

            // Atomically provision payment_method + subscription + content_access.
            const { error: provisionErr } = await supabase.rpc("provision_subscription", {
              p_parent_id:        order.parent_id,
              p_product_id:       order.product_id,
              p_order_id:         orderId,
              p_provider:         "mtn_momo",
              p_token:            null,
              p_phone:            phone,
              p_amount:           Number(order.amount),
              p_currency:         order.currency,
              p_billing_interval: billingInterval,
              p_period_start:     new Date().toISOString(),
              p_period_end:       periodEnd.toISOString(),
              p_access_type:      accessType,
              p_story_id:         product.story_id ?? null,
            });

            if (provisionErr) {
              console.error("[MTN MoMo] provision_subscription failed:", provisionErr.message);
              // Don't expose internal error — status polling will keep retrying.
              return NextResponse.json({ status: "pending" });
            }

            // Fire referral reward (best-effort)
            void fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://nimipiko.com"}/api/referral/reward`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-cron-secret": process.env.CRON_SECRET ?? "" },
              body: JSON.stringify({ referred_id: order.parent_id }),
            }).catch(() => {});

            // Track discount code redemption — atomic CAS prevents over-redemption race
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
              if (!incremented) {
                console.error(
                  "[MTN MoMo] Discount over-redemption detected.",
                  JSON.stringify({ discountCodeId, orderId, parentId: order.parent_id })
                );
              }
            }

            // Send email (best-effort) — gift or regular receipt
            const { data: parent } = await supabase.from("parents").select("email, name").eq("id", order.parent_id).maybeSingle();
            const isGift = (order.personalization_data as PersonalizationData | null)?.gift === true;
            if (isGift) {
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
                  productName: product.name ?? "Nimipiko Club",
                  message: giftRecord.message ?? null,
                  redeemUrl: `${siteUrl}/gift/redeem?code=${giftRecord.redemption_code}`,
                });
                if (parent?.email) {
                  void sendGiftConfirmation({
                    to: parent.email,
                    giverName: parent.name ?? "there",
                    recipientEmail: giftRecord.recipient_email,
                    productName: product.name ?? "Nimipiko Club",
                  });
                }
              }
            } else if (parent?.email) {
              void sendPaymentReceipt({
                to: parent.email,
                parentName: parent.name ?? "there",
                amount: String(order.amount),
                currency: order.currency,
                provider: "mtn_momo",
                periodEnd: periodEnd.toISOString(),
              });
              if (product?.tier === "club" || product?.tier === "club_annual") {
                void sendWelcomeToClub({
                  to: parent.email,
                  parentName: parent.name ?? "there",
                  billingInterval: product.billing_interval ?? "monthly",
                  renewsOn: periodEnd.toISOString(),
                });
              }
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
      }
      return NextResponse.json({ status: "completed" });
    } else if (data.status === "FAILED") {
      await supabase.from("orders").update({ payment_status: "failed" }).eq("id", orderId);
      return NextResponse.json({ status: "failed", reason: data.reason });
    } else {
      return NextResponse.json({ status: "pending" });
    }
  } catch (err: unknown) {
    console.error("[MTN MoMo status]", err);
    return NextResponse.json({ status: "pending" });
  }
}
