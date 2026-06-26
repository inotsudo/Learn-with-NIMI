import crypto from "crypto";

const MERCHANT_ID = process.env.CYBERSOURCE_MERCHANT_ID!;
const KEY_ID = process.env.CYBERSOURCE_KEY_ID!;
const SECRET_KEY = process.env.CYBERSOURCE_SECRET_KEY!;
const HOST = process.env.CYBERSOURCE_HOST || "apitest.cybersource.com";

export { HOST, MERCHANT_ID };

export function signRequest(method: "get" | "post", resource: string, body?: string) {
  const date = new Date().toUTCString();
  const isPost = method === "post";

  let digest = "";
  if (isPost && body) {
    digest = `SHA-256=${crypto.createHash("sha256").update(body).digest("base64")}`;
  }

  const headersList = isPost
    ? "host date (request-target) digest v-c-merchant-id"
    : "host date (request-target) v-c-merchant-id";

  let signString = `host: ${HOST}\ndate: ${date}\n(request-target): ${method} ${resource}`;
  if (isPost) signString += `\ndigest: ${digest}`;
  signString += `\nv-c-merchant-id: ${MERCHANT_ID}`;

  const signature = crypto
    .createHmac("sha256", Buffer.from(SECRET_KEY, "base64"))
    .update(signString)
    .digest("base64");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Host: HOST,
    Date: date,
    "v-c-merchant-id": MERCHANT_ID,
    Signature: `keyid="${KEY_ID}", algorithm="HmacSHA256", headers="${headersList}", signature="${signature}"`,
  };

  if (isPost && digest) headers.Digest = digest;

  return headers;
}
