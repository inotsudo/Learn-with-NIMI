import { NextRequest, NextResponse } from "next/server";

const EUROZONE = new Set([
  "AT","BE","CY","EE","FI","FR","DE","GR","IE","IT",
  "LV","LT","LU","MT","NL","PT","SK","SI","ES",
  "AD","MC","SM","VA", // EUR-using micro-states
]);

export async function GET(req: NextRequest) {
  // Vercel provides geo headers automatically
  const country = req.headers.get("x-vercel-ip-country") ?? "";
  const isRwanda = country === "RW";
  const isEurozone = EUROZONE.has(country);

  const currency = isRwanda ? "RWF" : isEurozone ? "EUR" : "USD";

  return NextResponse.json({
    country,
    currency,
    isLocal: isRwanda,
  }, {
    headers: { "Cache-Control": "private, max-age=86400" },
  });
}
