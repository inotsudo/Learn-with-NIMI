import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOST = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://invalid").hostname;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) return new NextResponse("Missing url", { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  if (parsed.hostname !== ALLOWED_HOST) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const upstream = await fetch(raw, { cache: "force-cache" });
  if (!upstream.ok) {
    return new NextResponse("Upstream error", { status: upstream.status });
  }

  const body = await upstream.arrayBuffer();
  return new NextResponse(body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
