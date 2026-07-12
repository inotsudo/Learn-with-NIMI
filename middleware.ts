import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── In-memory rate limiter ───────────────────────────────────────────────────
// Per-instance in serverless — resets on cold start, does not coordinate
// across Vercel function instances. Provides meaningful burst protection from
// a single IP on a single instance. For distributed rate limiting upgrade to
// @upstash/ratelimit + UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.
const rl = new Map<string, { count: number; reset: number }>();
const WINDOW = 60_000; // 1 minute

function ip(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// Evict expired entries so the Map stays bounded in warm long-running instances.
let lastEvict = 0;
function evictExpired() {
  const now = Date.now();
  if (now - lastEvict < WINDOW) return;
  lastEvict = now;
  for (const [k, v] of rl) { if (now > v.reset) rl.delete(k); }
}

function rateLimited(key: string, max: number): boolean {
  evictExpired();
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
  ["/api/orders",                10], // order creation + cancel
  ["/api/checkout",              10], // CyberSource capture context
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

  // 2. Admin route protection — session + admins table check
  if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/login") &&
    !pathname.startsWith("/admin/reset-password")
  ) {
    const supabase = createMiddlewareClient({ req, res });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify the user is in the admins table — prevents regular parents
    // from seeing admin UI during the client-side check window.
    const { data: adminRow } = await supabase
      .from("admins")
      .select("id")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!adminRow) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("error", "not_admin");
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
    "/api/orders/:path*",
    "/api/orders",
    "/api/checkout",
    "/api/payments/:path*",
    "/api/account/:path*",
    "/api/confirm-payment",
    "/api/push/:path*",
    "/api/nimi/:path*",
    "/api/admin/:path*",
  ],
};
