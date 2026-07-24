import { NextResponse } from "next/server";

const MAX_BODY_BYTES = 8_192;

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return new NextResponse(null, { status: 413 });
    }
    const body = await request.text();
    if (body.length <= MAX_BODY_BYTES) {
      console.error("[CSP]", new Date().toISOString(), body);
    }
  } catch {
    // ignore parse errors — always 204 so browsers don't retry
  }
  return new NextResponse(null, { status: 204 });
}
