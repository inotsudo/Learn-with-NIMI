export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { sendRenewalConfirmation } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GRACE_DAYS = 3;
const MAX_ATTEMPTS = 3;

// ── CyberSource charge with saved token ────────────────────
async function chargeCybersource(token: string, amount: number, currency: string, subId: string) {
  const merchantId = process.env.CYBERSOURCE_MERCHANT_ID!;
  const keyId = process.env.CYBERSOURCE_KEY_ID!;
  const secretKey = process.env.CYBERSOURCE_SECRET_KEY!;
  const host = process.env.CYBERSOURCE_HOST ?? "api.cybersource.com";

  const resource = "/pts/v2/payments";
  const date = new Date().toUTCString();

  const body = JSON.stringify({
    clientReferenceInformation: { code: `renewal-${subId}` },
    processingInformation: {
      capture: true,
      commerceIndicator: "recurring",
    },
    paymentInformation: {
      customer: { id: token },
    },
    orderInformation: {
      amountDetails: {
        totalAmount: amount.toFixed(2),
        currency,
      },
    },
  });

  const digest = `SHA-256=${crypto.createHash("sha256").update(body).digest("base64")}`;
  const signString = `host: ${host}\ndate: ${date}\n(request-target): post ${resource}\ndigest: ${digest}\nv-c-merchant-id: ${merchantId}`;
  const sig = crypto.createHmac("sha256", Buffer.from(secretKey, "base64")).update(signString).digest("base64");

  const res = await fetch(`https://${host}${resource}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Host: host, Date: date, Digest: digest,
      "v-c-merchant-id": merchantId,
      Signature: `keyid="${keyId}", algorithm="HmacSHA256", headers="host date (request-target) digest v-c-merchant-id", signature="${sig}"`,
    },
    body,
  });

  const data = await res.json();
  const ok = res.ok && (data.status === "AUTHORIZED" || data.status === "COMPLETED");
  return { ok, transactionId: data.id ?? null, error: ok ? null : (data.message || data.status) };
}

// ── MTN MoMo payment request ───────────────────────────────
async function chargeMoMo(phone: string, amount: number, subId: string) {
  const tokenUrl = process.env.MTN_REQUEST_TOKEN_ENDPOINT!;
  const payUrl = process.env.MTN_REQUEST_TO_PAY_ENDPOINT!;
  const apiUser = process.env.MOMO_API_USER!;
  const apiKey = process.env.MOMO_API_KEY!;
  const subKey = process.env.MOMO_COLLECTION_ACTIVE_KEY!;
  const targetEnv = process.env.MOMO_TARGET_ENVIRONMENT || "mtnrwanda";

  // Get token
  const creds = Buffer.from(`${apiUser}:${apiKey}`).toString("base64");
  const tokenRes = await fetch(tokenUrl, {
    method: "POST",
    headers: { Authorization: `Basic ${creds}`, "Ocp-Apim-Subscription-Key": subKey },
  });
  if (!tokenRes.ok) return { ok: false, referenceId: null, error: "MoMo token failed" };
  const { access_token } = await tokenRes.json();

  // Clean phone
  let p = phone.replace(/[\s\-+]/g, "");
  if (p.startsWith("0")) p = "250" + p.slice(1);
  if (!p.startsWith("250")) p = "250" + p;

  const refId = uuidv4();
  const res = await fetch(payUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "X-Reference-Id": refId,
      "X-Target-Environment": targetEnv,
      "Ocp-Apim-Subscription-Key": subKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: String(Math.round(amount)),
      currency: "RWF",
      externalId: `renewal-${subId}`,
      payer: { partyIdType: "MSISDN", partyId: p },
      payerMessage: "Nimipiko Club Renewal",
      payeeNote: `Subscription renewal ${subId}`,
    }),
  });

  return { ok: res.status === 202, referenceId: refId, error: res.status !== 202 ? "MoMo request failed" : null };
}

// ── Main cron handler ──────────────────────────────────────
export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = { renewed: 0, failed: 0, expired: 0, momo_pending: 0 };

  // 1. Find subscriptions due for renewal (period ended, still active)
  const { data: dueSubs } = await supabase
    .from("nimipiko_subscriptions")
    .select("*, payment_methods(*)")
    .eq("status", "active")
    .eq("cancel_at_period_end", false)
    .lte("current_period_end", now.toISOString());

  for (const sub of dueSubs ?? []) {
    const pm = sub.payment_methods;
    if (!pm || !pm.is_active) {
      // No payment method — mark past due
      await supabase.from("nimipiko_subscriptions").update({
        status: "past_due",
        grace_ends_at: new Date(now.getTime() + GRACE_DAYS * 86400000).toISOString(),
      }).eq("id", sub.id);
      results.failed++;
      continue;
    }

    // Check attempt limit
    if ((sub.renewal_attempts ?? 0) >= MAX_ATTEMPTS) {
      await supabase.from("nimipiko_subscriptions").update({ status: "past_due" }).eq("id", sub.id);
      results.failed++;
      continue;
    }

    let chargeResult;
    if (pm.provider === "cybersource" && pm.token) {
      chargeResult = await chargeCybersource(pm.token, Number(sub.amount), sub.currency, sub.id);
    } else if (pm.provider === "mtn_momo" && pm.phone_number) {
      chargeResult = await chargeMoMo(pm.phone_number, Number(sub.amount), sub.id);
    } else {
      results.failed++;
      continue;
    }

    // Log renewal attempt
    await supabase.from("subscription_renewals").insert({
      subscription_id: sub.id,
      payment_method_id: pm.id,
      amount: sub.amount,
      currency: sub.currency,
      status: chargeResult.ok ? "completed" : (pm.provider === "mtn_momo" ? "pending" : "failed"),
      provider_transaction_id: (chargeResult as any).transactionId || (chargeResult as any).referenceId,
      attempt_number: (sub.renewal_attempts ?? 0) + 1,
      error_message: chargeResult.error,
    });

    if (chargeResult.ok && pm.provider === "cybersource") {
      // Card charged — extend period
      const newEnd = new Date(sub.current_period_end);
      newEnd.setMonth(newEnd.getMonth() + (sub.billing_interval === "year" ? 12 : 1));

      await supabase.from("nimipiko_subscriptions").update({
        current_period_start: sub.current_period_end,
        current_period_end: newEnd.toISOString(),
        renewal_attempts: 0,
      }).eq("id", sub.id);

      // Send renewal confirmation email (best-effort)
      const { data: parent } = await supabase.from("parents").select("email, name").eq("id", sub.parent_id).maybeSingle();
      if (parent?.email) {
        void sendRenewalConfirmation({
          to: parent.email,
          parentName: parent.name ?? "there",
          amount: String(sub.amount),
          currency: sub.currency,
          periodEnd: newEnd.toISOString(),
        });
      }
      results.renewed++;
    } else if (pm.provider === "mtn_momo" && chargeResult.ok) {
      // MoMo request sent — user needs to approve. Mark pending.
      await supabase.from("nimipiko_subscriptions").update({
        renewal_attempts: (sub.renewal_attempts ?? 0) + 1,
      }).eq("id", sub.id);
      results.momo_pending++;
    } else {
      await supabase.from("nimipiko_subscriptions").update({
        renewal_attempts: (sub.renewal_attempts ?? 0) + 1,
      }).eq("id", sub.id);
      results.failed++;
    }
  }

  // 2. Expire past-due subscriptions after grace period
  const { data: expiredSubs } = await supabase
    .from("nimipiko_subscriptions")
    .select("id, parent_id")
    .eq("status", "past_due")
    .lte("grace_ends_at", now.toISOString());

  for (const sub of expiredSubs ?? []) {
    await supabase.from("nimipiko_subscriptions").update({ status: "expired" }).eq("id", sub.id);
    // Revoke content access
    await supabase.from("content_access").update({ is_active: false })
      .eq("subscription_id", sub.id);
    results.expired++;
  }

  return NextResponse.json({ ok: true, results, timestamp: now.toISOString() });
}
