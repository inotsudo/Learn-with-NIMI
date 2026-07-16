import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    console.warn("[CSP]", new Date().toISOString(), body);
  } catch {
    // ignore parse errors
  }
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  console.warn("CSP report endpoint GET reached");
  return NextResponse.json({ ok: true }, { status: 200 });
}
