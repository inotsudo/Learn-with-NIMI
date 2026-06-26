import * as crypto from "crypto";

export function generateDigest(payload: string): string {
  return `SHA-256=${crypto.createHash("sha256").update(payload).digest("base64")}`;
}

interface SignatureParams {
  method: string;
  resource: string;
  host: string;
  date: string;
  merchantId: string;
  keyId: string;
  secretKey: string;
  digest?: string;
}

export function generateSignature(params: SignatureParams): Record<string, string> {
  const { method, resource, host, date, merchantId, keyId, secretKey, digest } = params;
  const isPost = method.toLowerCase() === "post";

  const parts = [
    `host: ${host}`,
    `date: ${date}`,
    `(request-target): ${method.toLowerCase()} ${resource}`,
    ...(isPost && digest ? [`digest: ${digest}`] : []),
    `v-c-merchant-id: ${merchantId}`,
  ];

  const signatureString = parts.join("\n");

  const signature = crypto
    .createHmac("sha256", Buffer.from(secretKey, "base64"))
    .update(signatureString)
    .digest("base64");

  const headersList = isPost
    ? "host date (request-target) digest v-c-merchant-id"
    : "host date (request-target) v-c-merchant-id";

  return {
    Signature: `keyid="${keyId}", algorithm="HmacSHA256", headers="${headersList}", signature="${signature}"`,
  };
}
