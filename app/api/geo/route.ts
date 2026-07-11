import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Vercel provides geo headers automatically
  const country = req.headers.get("x-vercel-ip-country") ?? "";
  const isRwanda = country === "RW";

  return NextResponse.json({
    country,
    currency: isRwanda ? "RWF" : "USD",
    isLocal: isRwanda,
  });
}
