import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── In-memory rate limiter ───────────────────────────────────────────────────
// Intentionally lightweight; per-instance in serverless (resets on cold start).
// Provides meaningful friction against bursts from a single IP/client.
const rl = new Map<string, { count: number; reset: number }>();
const WINDOW = 60_000; // 1 minute

function ip(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function rateLimited(key: string, max: number): boolean {
  const now = Date.now();
  const e = rl.get(key);
  if (!e || now > e.reset) {
    rl.set(key, { count: 1, reset: now + WINDOW });
    return false;
  }
  e.count += 1;
  return e.count > max;
}

// ── Route → per-minute limit for non-GET requests ───────────────────────────
const LIMITS: [string, number][] = [
  ["/api/schools/inquiry",       5],  // lead form
  ["/api/newsletter",            5],  // newsletter sign-up
  ["/api/referral",              20], // referral code ops
  ["/api/gift",                  10], // gift creation + redemption
  ["/api/discount",              20], // discount code validation
  ["/api/payments",              10], // payment initiation
  ["/api/account/cancel",        10], // cancel sub
  ["/api/account/welcome-email", 5],  // welcome trigger
  ["/api/confirm-payment",       10], // webhook confirm
  ["/api/push",                  20], // push subscription ops
  ["/api/nimi",                  60], // AI chat
  ["/api/admin",                 60], // admin mutations
];

function tooManyRequests() {
  return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": "60" },
  });
}

// ── Middleware ───────────────────────────────────────────────────────────────
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;
  const clientIp = ip(req);

  // 1. Rate-limit sensitive API routes (mutations only)
  if (req.method !== "GET" && req.method !== "HEAD") {
    for (const [prefix, max] of LIMITS) {
      if (pathname.startsWith(prefix)) {
        if (rateLimited(`${clientIp}:${prefix}`, max)) return tooManyRequests();
        break;
      }
    }
  }

  // 2. Admin route protection — redirect unauthenticated visitors to /admin/login
  if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/login") &&
    !pathname.startsWith("/admin/reset-password")
  ) {
    const supabase = createMiddlewareClient({ req, res });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    // Admin pages
    "/admin/:path*",
    // Sensitive API prefixes
    "/api/newsletter",
    "/api/referral/:path*",
    "/api/referral",
    "/api/schools/:path*",
    "/api/payments/:path*",
    "/api/account/:path*",
    "/api/confirm-payment",
    "/api/push/:path*",
    "/api/nimi/:path*",
    "/api/admin/:path*",
  ],
};
