import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

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
    const body = await req.json();
    const { orderId, phoneNumber, amount } = body;

    if (!orderId || !phoneNumber || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
    if (!order || order.payment_status !== "pending") {
      return NextResponse.json({ error: "Invalid order" }, { status: 400 });
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
        amount: String(Math.round(amount)),
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
  } catch (err: any) {
    console.error("[MTN MoMo]", err);
    return NextResponse.json({ error: "Payment processing error" }, { status: 500 });
  }
}

// GET — check payment status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    const referenceId = searchParams.get("referenceId");

    if (!orderId || !referenceId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
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
      const { data: order } = await supabase.from("orders").select("*, products(tier, story_id)").eq("id", orderId).single();
      if (order && order.payment_status !== "completed") {
        await supabase.from("orders").update({
          payment_status: "completed",
          provider_transaction_id: data.financialTransactionId ?? referenceId,
          completed_at: new Date().toISOString(),
        }).eq("id", orderId);

        const product = order.products as any;
        if (product) {
          const accessType = product.tier === "club" ? "club"
            : product.tier === "personalized" ? "personalized"
            : product.tier === "champion_pack" ? "challenge_pack"
            : product.tier === "family_bundle" ? "bundle"
            : "story";
          await supabase.from("content_access").insert({
            parent_id: order.parent_id,
            access_type: accessType,
            story_id: product.story_id,
            order_id: orderId,
          });
        }
      }
      return NextResponse.json({ status: "completed" });
    } else if (data.status === "FAILED") {
      await supabase.from("orders").update({ payment_status: "failed" }).eq("id", orderId);
      return NextResponse.json({ status: "failed", reason: data.reason });
    } else {
      return NextResponse.json({ status: "pending" });
    }
  } catch (err: any) {
    console.error("[MTN MoMo status]", err);
    return NextResponse.json({ status: "pending" });
  }
}
