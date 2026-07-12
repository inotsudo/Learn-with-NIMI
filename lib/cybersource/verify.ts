import * as crypto from "crypto";

const AUTHORIZED_STATUSES = [
  "AUTHORIZED",
  "AUTHORIZED_PENDING_REVIEW",
  "PARTIAL_AUTHORIZED",
  "COMPLETED",
];

export async function verifyCybersourceTransaction(
  transactionId: string
): Promise<{ csStatus: string; isAuthorized: boolean; authorizedAmount: number; customerToken: string | null }> {
  const merchantId = process.env.CYBERSOURCE_MERCHANT_ID!;
  const keyId = process.env.CYBERSOURCE_KEY_ID!;
  const secretKey = process.env.CYBERSOURCE_SECRET_KEY!;
  const host = process.env.CYBERSOURCE_HOST ?? "api.cybersource.com";

  const resourcePath = `/pts/v2/payments/${transactionId}`;
  const date = new Date().toUTCString();

  const signatureString = [
    `host: ${host}`,
    `date: ${date}`,
    `(request-target): get ${resourcePath}`,
    `v-c-merchant-id: ${merchantId}`,
  ].join("\n");

  const signatureHash = crypto
    .createHmac("sha256", Buffer.from(secretKey, "base64"))
    .update(signatureString)
    .digest("base64");

  const signatureHeader =
    `keyid="${keyId}", algorithm="HmacSHA256", ` +
    `headers="host date (request-target) v-c-merchant-id", signature="${signatureHash}"`;

  const res = await fetch(`https://${host}${resourcePath}`, {
    headers: {
      "v-c-merchant-id": merchantId,
      Date: date,
      Host: host,
      Signature: signatureHeader,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.status.toString());
    throw new Error(`CyberSource payment lookup failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const csStatus = (data.status as string) ?? "";
  const authorizedAmount = parseFloat(
    data.orderInformation?.amountDetails?.authorizedAmount ??
    data.orderInformation?.amountDetails?.totalAmount ??
    "0"
  );
  // Prefer the customer token (reusable for recurring charges) over the raw transaction ID.
  const customerToken = (data.tokenInformation?.customer?.id as string | undefined) ?? null;
  return { csStatus, isAuthorized: AUTHORIZED_STATUSES.includes(csStatus), authorizedAmount, customerToken };
}
