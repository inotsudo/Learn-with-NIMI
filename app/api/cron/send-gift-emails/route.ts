// Cron: send scheduled gift emails
// Runs daily at 08:00 UTC. Finds gift records where send_at <= now,
// email_sent_at is null, and the order is completed — then sends.
//
// Idempotency: each gift is claimed atomically (UPDATE WHERE email_sent_at IS NULL
// RETURNING id) before the email is sent, so concurrent cron runs never double-send.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { dispatchGiftEmail } from "@/app/api/confirm-payment/route";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();

  // Gifts due for delivery: send_at in the past, email not yet sent, order paid
  const { data: pending } = await supabase
    .from("gift_subscriptions")
    .select("id, order_id, orders!inner(payment_status, parent_id), parents!giver_parent_id(email, name)")
    .lte("send_at", now)
    .is("email_sent_at", null)
    .eq("orders.payment_status", "completed")
    .limit(50);

  if (!pending?.length) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  for (const row of pending) {
    const order = (row.orders as unknown) as { payment_status: string; parent_id: string } | null;
    const giver = (row.parents as unknown) as { email?: string; name?: string } | null;
    if (!order) continue;

    // Atomic CAS claim: mark email_sent_at NOW before sending.
    // If another cron run already claimed this gift, 0 rows are returned and
    // we skip — preventing double-sends even under concurrent cron execution.
    const { data: claimed } = await supabase
      .from("gift_subscriptions")
      .update({ email_sent_at: now })
      .eq("id", row.id)
      .is("email_sent_at", null) // only claim if still unclaimed
      .select("id")
      .maybeSingle();

    if (!claimed) continue; // another run got there first

    await dispatchGiftEmail(supabase, row.order_id, giver, null);
    sent++;
  }

  return NextResponse.json({ sent });
}
