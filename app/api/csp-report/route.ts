import { NextResponse } from "next/server";
import { appendFile } from "fs/promises";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const entry = `${new Date().toISOString()}\t${body}\n`;
    await appendFile("/tmp/csp_reports.log", entry, { encoding: "utf8" });
  } catch (err) {
    console.error("Failed to persist CSP report", err);
  }
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  console.warn("CSP report endpoint GET reached");
  return NextResponse.json({ ok: true }, { status: 200 });
}
