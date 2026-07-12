import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
// @ts-ignore — auth-helpers-nextjs pre-dates Next.js 15 async cookies; passing the fn works at runtime
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CS_MERCHANT_ID = process.env.CYBERSOURCE_MERCHANT_ID!;
const CS_KEY_ID = process.env.CYBERSOURCE_KEY_SERIAL || process.env.CYBERSOURCE_KEY_ID!;
const CS_ENV = process.env.CYBERSOURCE_ENVIRONMENT || "apitest";
const CS_HOST = CS_ENV === "production"
  ? "api.cybersource.com"
  : "apitest.cybersource.com";

function getPrivateKey(): string {
  // Prefer env var (required on serverless — Vercel filesystem is read-only)
  const keyEnv = process.env.CYBERSOURCE_PRIVATE_KEY;
  if (keyEnv) {
    const pem = keyEnv.replace(/\\n/g, "\n");
    const start = pem.indexOf("-----BEGIN");
    return start > 0 ? pem.slice(start) : pem;
  }
  // Fallback: local file path (dev/self-hosted only)
  const keyPath = process.env.CYBERSOURCE_PRIVATE_KEY_PATH;
  if (keyPath) {
    const resolved = path.resolve(keyPath);
    if (fs.existsSync(resolved)) {
      const content = fs.readFileSync(resolved, "utf-8");
      const start = content.indexOf("-----BEGIN");
      return start > 0 ? content.slice(start) : content;
    }
  }
  throw new Error("CyberSource private key not configured. Set CYBERSOURCE_PRIVATE_KEY env var.");
}

function generateHeaders(method: string, resource: string, payload: string): Record<string, string> {
  const date = new Date().toUTCString();
  const digest = `SHA-256=${crypto.createHash("sha256").update(payload || "").digest("base64")}`;

  const sigHeaders = method === "get"
    ? "host date (request-target) v-c-merchant-id"
    : "host date (request-target) digest v-c-merchant-id";

  let signString = `host: ${CS_HOST}\ndate: ${date}\n(request-target): ${method} ${resource}`;
  if (method !== "get") signString += `\ndigest: ${digest}`;
  signString += `\nv-c-merchant-id: ${CS_MERCHANT_ID}`;

  const privateKey = getPrivateKey();
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signString);
  const signature = sign.sign(privateKey, "base64");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Host: CS_HOST,
    Date: date,
    Signature: `keyid="${CS_KEY_ID}", algorithm="HmacSHA256", headers="${sigHeaders}", signature="${signature}"`,
    "v-c-merchant-id": CS_MERCHANT_ID,
  };
  if (method !== "get") headers.Digest = digest;
  return headers;
}

export async function POST(req: NextRequest) {
  try {
    // Verify caller is the authenticated parent who owns this order.
    const authClient = createRouteHandlerClient({ cookies });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, transientToken, currency } = body;

    if (!orderId || !currency) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!transientToken) {
      return NextResponse.json({ error: "Missing payment token" }, { status: 400 });
    }

    const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
    if (!order || order.payment_status !== "pending") {
      return NextResponse.json({ error: "Invalid order" }, { status: 400 });
    }
    if (order.parent_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await supabase.from("orders").update({ payment_status: "processing" }).eq("id", orderId);

    const resource = "/pts/v2/payments";
    const payload = JSON.stringify({
      clientReferenceInformation: { code: orderId },
      processingInformation: { capture: true },
      tokenInformation: { transientTokenJwt: transientToken },
      orderInformation: {
        amountDetails: {
          // Always use DB amount — never trust client-supplied value.
          totalAmount: String(order.amount),
          currency,
        },
      },
    });

    const headers = generateHeaders("post", resource, payload);

    const response = await fetch(`https://${CS_HOST}${resource}`, {
      method: "POST",
      headers,
      body: payload,
    });

    const result = await response.json();

    if (response.ok && result.status === "AUTHORIZED") {
      await supabase.from("orders").update({
        payment_status: "completed",
        provider_transaction_id: result.id,
        completed_at: new Date().toISOString(),
      }).eq("id", orderId);

      const { data: product } = await supabase.from("products").select("tier, story_id").eq("id", order.product_id).single();
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

      return NextResponse.json({ success: true, transactionId: result.id });
    } else {
      await supabase.from("orders").update({
        payment_status: "failed",
        provider_transaction_id: result.id ?? null,
      }).eq("id", orderId);
      return NextResponse.json({
        error: result.message || result.errorInformation?.message || "Payment failed",
        details: result.status,
      }, { status: 400 });
    }
  } catch (err: unknown) {
    console.error("[CyberSource]", err);
    return NextResponse.json({ error: "Payment processing error" }, { status: 500 });
  }
}
