export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabaseRouteAuth";
import * as crypto from "crypto";
import { getServiceClient } from "@/lib/supabase/serviceClient";



export async function POST(request: NextRequest) {
  const supabase = getServiceClient();
  try {
    // Auth check — caller must be logged in and own the order
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, message: "Missing orderId" }, { status: 400 });
    }

    // Resolve authoritative amount from DB — never trust client
    const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    // Owner check — prevents BOLA: user A getting a capture context for user B's order
    if (order.parent_id !== user.id) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const formattedAmount = parseFloat(String(order.amount)).toFixed(2);
    const currency = order.currency;

    const merchantId = process.env.CYBERSOURCE_MERCHANT_ID!;
    const keyId = process.env.CYBERSOURCE_KEY_ID!;
    const secretKey = process.env.CYBERSOURCE_SECRET_KEY!;
    const host = process.env.CYBERSOURCE_HOST ?? "api.cybersource.com";

    const rawOrigin = request.headers.get("origin") || "";
    const resourcePath = "/up/v1/capture-contexts";

    // Allowlist only known-good origins — never reflect arbitrary origins to CyberSource.
    const STATIC_ORIGINS = [
      "https://nimipiko.com",
      "https://www.nimipiko.com",
      "https://learn-with-nimi.vercel.app",
    ];
    const isAllowedOrigin =
      STATIC_ORIGINS.includes(rawOrigin) ||
      /^https:\/\/learn-with-nimi-[a-z0-9-]+\.vercel\.app$/.test(rawOrigin);
    const targetOrigins = isAllowedOrigin ? [rawOrigin] : STATIC_ORIGINS;

    const bodyObj = {
      targetOrigins,
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
          amountDetails: { totalAmount: formattedAmount, currency },
        },
      },
    };

    const bodyString = JSON.stringify(bodyObj);
    const date = new Date().toUTCString();
    const digest = `SHA-256=${crypto.createHash("sha256").update(bodyString).digest("base64")}`;

    const signatureString = [
      `host: ${host}`,
      `date: ${date}`,
      `(request-target): post ${resourcePath}`,
      `digest: ${digest}`,
      `v-c-merchant-id: ${merchantId}`,
    ].join("\n");

    const signatureHash = crypto
      .createHmac("sha256", Buffer.from(secretKey, "base64"))
      .update(signatureString)
      .digest("base64");

    const signatureHeader =
      `keyid="${keyId}", algorithm="HmacSHA256", ` +
      `headers="host date (request-target) digest v-c-merchant-id", ` +
      `signature="${signatureHash}"`;

    const response = await fetch(`https://${host}${resourcePath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "v-c-merchant-id": merchantId,
        Date: date,
        Host: host,
        Digest: digest,
        Signature: signatureHeader,
      },
      body: bodyString,
    });

    const result = await response.text();

    if (response.ok) {
      return NextResponse.json({ success: true, captureContext: result });
    }

    console.error("[Checkout]", response.status, result);
    return NextResponse.json(
      { success: false, message: "Payment service unavailable." },
      { status: response.status }
    );
  } catch (error: unknown) {
    console.error("[Checkout]", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
