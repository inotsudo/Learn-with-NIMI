export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendRenewalConfirmation } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const statusUrl = process.env.MTN_TRANSACTION_STATUS_ENDPOINT!;
    const tokenUrl = process.env.MTN_REQUEST_TOKEN_ENDPOINT!;
    const apiUser = process.env.MOMO_API_USER!;
    const apiKey = process.env.MOMO_API_KEY!;
    const subKey = process.env.MOMO_COLLECTION_ACTIVE_KEY!;
    const targetEnv = process.env.MOMO_TARGET_ENVIRONMENT || "mtnrwanda";

    // Get MoMo access token
    const creds = Buffer.from(`${apiUser}:${apiKey}`).toString("base64");
    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { Authorization: `Basic ${creds}`, "Ocp-Apim-Subscription-Key": subKey },
    });
    if (!tokenRes.ok) return NextResponse.json({ error: "MoMo token failed" }, { status: 500 });
    const { access_token } = await tokenRes.json();

  // Find pending MoMo renewals
  const { data: pending } = await supabase
    .from("subscription_renewals")
    .select("*, nimipiko_subscriptions(*)")
    .eq("status", "pending")
    .not("provider_transaction_id", "is", null);

  let confirmed = 0, failed = 0;

  for (const renewal of pending ?? []) {
    const url = statusUrl.replace("{referenceId}", renewal.provider_transaction_id);
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "X-Target-Environment": targetEnv,
        "Ocp-Apim-Subscription-Key": subKey,
      },
    });

    if (!res.ok) continue;
    const data = await res.json();

    if (data.status === "SUCCESSFUL") {
      // Extend subscription period
      const sub = renewal.nimipiko_subscriptions;
      let newPeriodEnd: Date | null = null;
      if (sub) {
        newPeriodEnd = new Date(sub.current_period_end);
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + (sub.billing_interval === "year" ? 12 : 1));

        await supabase.from("nimipiko_subscriptions").update({
          current_period_start: sub.current_period_end,
          current_period_end: newPeriodEnd.toISOString(),
          renewal_attempts: 0,
          status: "active",
        }).eq("id", sub.id);
      }

      await supabase.from("subscription_renewals").update({
        status: "completed",
      }).eq("id", renewal.id);

      // Send renewal receipt email (best-effort)
      if (sub && newPeriodEnd) {
        const { data: parent } = await supabase.from("parents").select("email, name").eq("id", sub.parent_id).maybeSingle();
        if (parent?.email) {
          void sendRenewalConfirmation({
            to: parent.email,
            parentName: parent.name ?? "there",
            amount: String(sub.amount),
            currency: sub.currency,
            periodEnd: newPeriodEnd.toISOString(),
          });
        }
      }
      confirmed++;

    } else if (data.status === "FAILED") {
      await supabase.from("subscription_renewals").update({
        status: "failed",
        error_message: data.reason || "MoMo payment declined",
      }).eq("id", renewal.id);
      failed++;
    }
    // PENDING — do nothing, check again next run
    }

    return NextResponse.json({ ok: true, confirmed, failed, checked: (pending ?? []).length });
  } catch (err: unknown) {
    console.error("[check-momo-renewals] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
