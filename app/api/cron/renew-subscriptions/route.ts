export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { sendRenewalConfirmation, sendRenewalFailed, sendAdminAlert } from "@/lib/email";

type CyberSourceResult = { ok: boolean; transactionId: string | null; error: string | null };
type MoMoResult        = { ok: boolean; referenceId: string | null;   error: string | null };

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
  // Verify cron secret — use template-literal comparison so undefined secret never matches
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const results = { renewed: 0, failed: 0, expired: 0, momo_pending: 0, no_token: 0 };

    // 1. Find subscriptions due for renewal (period ended, still active).
    // LIMIT 50 prevents a single cron run from exceeding the serverless timeout
    // when many subscriptions expire simultaneously. The next run picks up the rest.
    const { data: dueSubs } = await supabase
      .from("nimipiko_subscriptions")
      .select("*, payment_methods(*)")
      .eq("status", "active")
      .eq("cancel_at_period_end", false)
      .lte("current_period_end", now.toISOString())
      .order("current_period_end", { ascending: true })
      .limit(50);

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

      // CAS claim-before-charge: atomically increment renewal_attempts before
      // calling any payment API. If another cron run already incremented the
      // counter this loop iteration we see 0 rows and skip — preventing
      // double-charges even when two cron instances fire concurrently.
      const { data: claimed } = await supabase
        .from("nimipiko_subscriptions")
        .update({ renewal_attempts: (sub.renewal_attempts ?? 0) + 1 })
        .eq("id", sub.id)
        .eq("renewal_attempts", sub.renewal_attempts ?? 0) // only matches if count hasn't changed
        .select("id")
        .maybeSingle();

      if (!claimed) {
        // Another cron instance is already processing this subscription.
        results.momo_pending++;
        continue;
      }

      let chargeResult: CyberSourceResult | MoMoResult;
      if (pm.provider === "cybersource" && pm.token) {
        chargeResult = await chargeCybersource(pm.token, Number(sub.amount), sub.currency, sub.id);
      } else if (pm.provider === "mtn_momo" && pm.phone_number) {
        // Guard: if a MoMo renewal is already pending (user hasn't approved yet),
        // skip this run — sending another request would prompt the user multiple times.
        const { data: existingPending } = await supabase
          .from("subscription_renewals")
          .select("id")
          .eq("subscription_id", sub.id)
          .eq("status", "pending")
          .maybeSingle();
        if (existingPending) {
          results.momo_pending++;
          continue;
        }
        chargeResult = await chargeMoMo(pm.phone_number, Number(sub.amount), sub.id);
      } else {
        // No usable payment method (CyberSource TMS not enabled → null token, or MoMo without phone).
        // Mark past_due with grace period so the subscriber has time to re-add a payment method.
        const reason = pm.provider === "cybersource" && !pm.token
          ? "cybersource_no_token — enable Token Management Service in CyberSource Business Center"
          : "no_usable_payment_method";
        console.error("[renew-subscriptions] Cannot charge sub", JSON.stringify({
          subId: sub.id, parentId: sub.parent_id, provider: pm.provider, reason,
        }));
        await supabase.from("nimipiko_subscriptions").update({
          status: "past_due",
          grace_ends_at: new Date(now.getTime() + GRACE_DAYS * 86400000).toISOString(),
        }).eq("id", sub.id);
        if (pm.provider === "cybersource" && !pm.token) results.no_token++;
        else results.failed++;
        continue;
      }

      // Log renewal attempt
      await supabase.from("subscription_renewals").insert({
        subscription_id: sub.id,
        payment_method_id: pm.id,
        amount: sub.amount,
        currency: sub.currency,
        // MoMo 202 = request sent, user approval still pending — NOT yet "completed".
        // CyberSource ok = charge collected immediately = "completed".
        status: pm.provider === "mtn_momo"
          ? (chargeResult.ok ? "pending" : "failed")
          : (chargeResult.ok ? "completed" : "failed"),
        provider_transaction_id: pm.provider === "cybersource"
          ? (chargeResult as CyberSourceResult).transactionId
          : (chargeResult as MoMoResult).referenceId,
        attempt_number: (sub.renewal_attempts ?? 0) + 1,
        error_message: chargeResult.error,
      });

      if (chargeResult.ok && pm.provider === "cybersource") {
        // Card charged — extend period. Reset renewal_attempts since charge succeeded.
        const newEnd = new Date(sub.current_period_end);
        if (sub.billing_interval === "year") {
          newEnd.setFullYear(newEnd.getFullYear() + 1);
        } else {
          newEnd.setMonth(newEnd.getMonth() + 1);
        }

        await supabase.from("nimipiko_subscriptions").update({
          current_period_start: sub.current_period_end,
          current_period_end: newEnd.toISOString(),
          renewal_attempts: 0, // reset after success
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
        // MoMo request sent — user needs to approve on their phone. Already
        // incremented renewal_attempts above via the CAS claim.
        results.momo_pending++;
      } else {
        // Charge failed — renewal_attempts already incremented via CAS claim above.

        // Notify parent so they can update payment details before grace period ends
        const { data: failedParent } = await supabase
          .from("parents")
          .select("email, name")
          .eq("id", sub.parent_id)
          .maybeSingle();
        if (failedParent?.email) {
          void sendRenewalFailed({
            to: failedParent.email,
            parentName: failedParent.name ?? "there",
            amount: String(sub.amount),
            currency: sub.currency,
          });
        }

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

    // Alert admin if any subscriptions couldn't renew due to missing CyberSource token
    if (results.no_token > 0) {
      void sendAdminAlert({
        subject: `${results.no_token} subscription(s) failed renewal — no CyberSource token`,
        body: [
          `${results.no_token} active subscription(s) could not be renewed because CyberSource`,
          `Token Management Service (TMS) is not enabled or the token was never stored.`,
          ``,
          `These subscriptions have been moved to past_due with a ${GRACE_DAYS}-day grace period.`,
          ``,
          `Action required:`,
          `  1. Enable TMS in CyberSource Business Center → Payment Configuration → Tokenization`,
          `  2. Contact affected parents to re-enter payment details`,
          ``,
          `Cron results: ${JSON.stringify(results)}`,
          `Timestamp: ${now.toISOString()}`,
        ].join("\n"),
      });
    }

    return NextResponse.json({ ok: true, results, timestamp: now.toISOString() });
  } catch (err: unknown) {
    console.error("[renew-subscriptions] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
