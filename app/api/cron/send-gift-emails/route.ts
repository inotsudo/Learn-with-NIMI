// Cron: send scheduled gift emails
// Runs daily at 08:00 UTC. Finds gift records where send_at <= now,
// email_sent_at is null, and the order is completed — then sends.

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

  // Gifts due for delivery: send_at in the past, email not yet sent, order paid
  const { data: pending } = await supabase
    .from("gift_subscriptions")
    .select("order_id, orders!inner(payment_status, parent_id), parents!giver_parent_id(email, name)")
    .lte("send_at", new Date().toISOString())
    .is("email_sent_at", null)
    .eq("orders.payment_status", "completed");

  if (!pending?.length) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  for (const row of pending) {
    const order = (row.orders as unknown) as { payment_status: string; parent_id: string } | null;
    const giver = (row.parents as unknown) as { email?: string; name?: string } | null;
    if (!order) continue;

    await dispatchGiftEmail(supabase, row.order_id, giver, null);
    sent++;
  }

  return NextResponse.json({ sent });
}
