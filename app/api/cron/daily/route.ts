export const runtime = "nodejs";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";

// Combined daily cron — runs all scheduled jobs in one request.
// Vercel Hobby allows max 2 crons, so we fan out to individual handlers
// internally rather than registering each one separately.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const host = req.headers.get("host") ?? "";
  const base = host.includes("localhost") ? `http://${host}` : `https://${host}`;
  const auth = { Authorization: `Bearer ${cronSecret}` };

  const dailyJobs: Promise<Response>[] = [
    fetch(`${base}/api/cron/renew-subscriptions`,      { headers: auth }),
    fetch(`${base}/api/cron/check-momo-renewals`,      { headers: auth }),
    fetch(`${base}/api/cron/send-gift-emails`,         { headers: auth }),
    fetch(`${base}/api/cron/process-referral-rewards`, { headers: auth }),
    // xAPI flush uses X-Service-Key auth
    fetch(`${base}/api/enterprise/xapi?flush=1`, {
      method: "POST",
      headers: { "x-service-key": cronSecret },
    }),
  ];

  // Weekly digest only on Mondays
  if (new Date().getDay() === 1) {
    dailyJobs.push(fetch(`${base}/api/cron/weekly-digest`, { headers: auth }));
  }

  const settled = await Promise.allSettled(dailyJobs);
  const summary = await Promise.all(
    settled.map(async (r, i) => {
      if (r.status === "rejected") return { job: i, ok: false, error: String(r.reason) };
      return { job: i, ok: r.value.ok, status: r.value.status };
    })
  );

  const allOk = summary.every((s) => s.ok);
  return NextResponse.json({ ok: allOk, jobs: summary }, { status: allOk ? 200 : 207 });
}
