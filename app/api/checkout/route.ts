import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { signRequest, HOST, MERCHANT_ID } from "@/lib/cybersource/signer";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

    // Resolve authoritative amount from DB — never trust client
    const { data: order } = await supabase
      .from("orders")
      .select("*, products(price_usd, price_eur, price_rwf)")
      .eq("id", orderId)
      .single();

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const amount = String(order.amount);
    const currency = order.currency;

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const resource = "/up/v1/capture-contexts";
    const body = JSON.stringify({
      targetOrigins: [origin],
      clientVersion: "0.34",
      allowedPaymentTypes: ["PANENTRY", "GOOGLEPAY"],
      allowedCardNetworks: ["VISA", "MASTERCARD", "AMEX"],
      country: currency === "RWF" ? "RW" : "US",
      locale: "en_US",
      captureMandate: {
        billingType: "FULL",
        requestEmail: true,
        requestPhone: true,
        requestShipping: false,
      },
      completeMandate: {
        type: "CAPTURE",
        decisionManager: true,
        consumerAuthentication: true,
      },
      data: {
        orderInformation: {
          amountDetails: { totalAmount: amount, currency },
        },
      },
    });

    const headers = signRequest("post", resource, body);

    const res = await fetch(`https://${HOST}${resource}`, {
      method: "POST",
      headers,
      body,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Checkout] Capture context error:", res.status, errText);
      return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 });
    }

    const captureContext = await res.text();
    return NextResponse.json({ captureContext });
  } catch (err: any) {
    console.error("[Checkout]", err);
    return NextResponse.json({ error: "Checkout initialization failed" }, { status: 500 });
  }
}
