import { NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const CS_MERCHANT_ID = process.env.CYBERSOURCE_MERCHANT_ID!;
const CS_KEY_ID = process.env.CYBERSOURCE_KEY_SERIAL || process.env.CYBERSOURCE_KEY_ID!;
const CS_ENV = process.env.CYBERSOURCE_ENVIRONMENT || "apitest";
const CS_HOST = CS_ENV === "production"
  ? "api.cybersource.com"
  : "apitest.cybersource.com";

function getPrivateKey(): string {
  const keyPath = process.env.CYBERSOURCE_PRIVATE_KEY_PATH;
  if (keyPath) {
    const resolved = path.resolve(keyPath);
    if (fs.existsSync(resolved)) {
      const content = fs.readFileSync(resolved, "utf-8");
      const start = content.indexOf("-----BEGIN");
      return start > 0 ? content.slice(start) : content;
    }
  }
  throw new Error("CyberSource private key not found");
}

export async function POST() {
  try {
    const resource = "/flex/v2/sessions";
    const date = new Date().toUTCString();

    const payload = JSON.stringify({
      targetOrigins: [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://nimipiko.com",
        "https://www.nimipiko.com",
        process.env.NEXT_PUBLIC_APP_URL,
      ].filter(Boolean),
      allowedCardNetworks: ["VISA", "MASTERCARD", "AMEX"],
      clientVersion: "v2.0",
      checkoutApiInitialization: {
        profileId: process.env.CYBERSOURCE_SA_PROFILE_ID,
      },
    });

    const digest = `SHA-256=${crypto.createHash("sha256").update(payload).digest("base64")}`;

    const signString = `host: ${CS_HOST}\ndate: ${date}\n(request-target): post ${resource}\ndigest: ${digest}\nv-c-merchant-id: ${CS_MERCHANT_ID}`;

    const privateKey = getPrivateKey();
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(signString);
    const signature = sign.sign(privateKey, "base64");

    const response = await fetch(`https://${CS_HOST}${resource}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: CS_HOST,
        Date: date,
        Digest: digest,
        Signature: `keyid="${CS_KEY_ID}", algorithm="HmacSHA256", headers="host date (request-target) digest v-c-merchant-id", signature="${signature}"`,
        "v-c-merchant-id": CS_MERCHANT_ID,
      },
      body: payload,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[CyberSource Flex] Session error:", response.status, errText);
      return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 });
    }

    const captureContext = await response.text();
    return NextResponse.json({ captureContext });
  } catch (err: any) {
    console.error("[CyberSource Flex]", err);
    return NextResponse.json({ error: "Failed to initialize payment" }, { status: 500 });
  }
}
