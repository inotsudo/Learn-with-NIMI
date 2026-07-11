import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WEBHOOK_SECRET = process.env.CYBERSOURCE_WEBHOOK_SECRET;

function verifySignature(req: NextRequest, body: string): boolean {
  if (!WEBHOOK_SECRET) return false;

  const sigHeader = req.headers.get("v-c-signature") || "";
  const match = sigHeader.match(/signature="([^"]+)"/);
  if (!match) return false;

  const receivedSig = match[1];
  const date = req.headers.get("date") || "";
  const host = req.headers.get("host") || "";
  const digest = `SHA-256=${crypto.createHash("sha256").update(body).digest("base64")}`;
  const merchantId = req.headers.get("v-c-merchant-id") || "";

  const signString = `host: ${host}\ndate: ${date}\n(request-target): post /api/webhooks/cybersource\ndigest: ${digest}\nv-c-merchant-id: ${merchantId}`;

  const expected = crypto
    .createHmac("sha256", Buffer.from(WEBHOOK_SECRET, "base64"))
    .update(signString)
    .digest();

  const received = Buffer.from(receivedSig, "base64");

  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

export async function POST(req: NextRequest) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  }

  const body = await req.text();

  if (!verifySignature(req, body)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const event = JSON.parse(body);
    const eventType = event.eventType || "";

    if (eventType.startsWith("dispute.") || eventType.includes("chargeback")) {
      const txId = event.payload?.id;
      if (txId) {
        await supabase.from("orders")
          .update({ payment_status: "refunded" })
          .eq("provider_transaction_id", txId);
        console.warn("[Webhook] Chargeback received:", txId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error("[Webhook]", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
