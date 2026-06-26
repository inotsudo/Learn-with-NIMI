import { signRequest, HOST } from "./signer";

const AUTHORIZED_STATUSES = new Set([
  "AUTHORIZED",
  "AUTHORIZED_PENDING_REVIEW",
  "PARTIAL_AUTHORIZED",
  "COMPLETED",
]);

export async function verifyCybersourceTransaction(transactionId: string) {
  const resource = `/pts/v2/payments/${transactionId}`;
  const headers = signRequest("get", resource);

  const res = await fetch(`https://${HOST}${resource}`, { headers });
  if (!res.ok) {
    const text = await res.text();
    console.error("[CyberSource verify]", res.status, text);
    return { csStatus: "ERROR", isAuthorized: false, authorizedAmount: "0" };
  }

  const data = await res.json();
  const csStatus = data.status ?? "UNKNOWN";
  const isAuthorized = AUTHORIZED_STATUSES.has(csStatus);
  const authorizedAmount =
    data.orderInformation?.amountDetails?.authorizedAmount ??
    data.orderInformation?.amountDetails?.totalAmount ??
    "0";

  return { csStatus, isAuthorized, authorizedAmount };
}
