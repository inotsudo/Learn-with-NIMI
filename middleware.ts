import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── Distributed rate limiter (Upstash) ──────────────────────────────────────
// When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, rate limits
// are coordinated across all Vercel function instances via Redis (sliding window).
// Without those env vars the limiter is absent and the in-memory fallback runs.
// To activate: set the two env vars in Vercel project settings (or .env.local).
let redis: Redis | null = null;
const upstashLimiters = new Map<number, Ratelimit>();

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

function getUpstashLimiter(max: number): Ratelimit {
  if (!upstashLimiters.has(max)) {
    upstashLimiters.set(max, new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(max, "60 s"),
      prefix: "nimipiko:rl",
    }));
  }
  return upstashLimiters.get(max)!;
}

// ── In-memory fallback ───────────────────────────────────────────────────────
// Per-instance — resets on cold start, does not coordinate across instances.
// Provides meaningful burst protection from a single IP on one instance.
const rl = new Map<string, { count: number; reset: number }>();
const WINDOW = 60_000;

function ip(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

let lastEvict = 0;
function evictExpired() {
  const now = Date.now();
  if (now - lastEvict < WINDOW) return;
  lastEvict = now;
  for (const [k, v] of rl) { if (now > v.reset) rl.delete(k); }
}

function inMemoryLimited(key: string, max: number): boolean {
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

// ── Unified rate-limit check ─────────────────────────────────────────────────
async function rateLimited(key: string, max: number): Promise<boolean> {
  if (redis) {
    const { success } = await getUpstashLimiter(max).limit(key);
    return !success;
  }
  return inMemoryLimited(key, max);
}

// ── Route → per-minute limit for non-GET requests ───────────────────────────
const LIMITS: [string, number][] = [
  ["/api/auth/send-reset",       5],  // password reset — limit to protect Resend quota and prevent spam
  ["/api/schools/inquiry",       5],  // lead form
  ["/api/newsletter",            5],  // newsletter sign-up
  ["/api/referral/validate",     10], // public code-check — tighter to block enumeration
  ["/api/referral",              20], // referral code ops
  ["/api/gift",                  10], // gift creation + redemption
  ["/api/discount",              20], // discount code validation (brute-force guard)
  ["/api/orders",                10], // order creation + cancel
  ["/api/checkout",              10], // CyberSource capture context
  ["/api/payments",              10], // payment initiation
  ["/api/account/cancel",        10], // cancel sub
  ["/api/account/delete",        3],  // account deletion — very low to prevent abuse
  ["/api/account/welcome-email", 5],  // welcome trigger
  ["/api/confirm-payment",       10], // payment confirmation
  ["/api/push",                  20], // push subscription ops
  ["/api/nimi",                  60], // AI chat + proactive + recommendations
  ["/api/parent-ai",             10], // parent insight generation (expensive LLM)
  ["/api/parent-insights",       10], // parent insight generation (expensive LLM)
  ["/api/parent-recommendations", 10], // parent recommendation generation
  ["/api/ai/event",             120], // event inference (fast, but fire-and-forget)
  ["/api/masterpiece",           10], // expensive PDF generation
  ["/api/admin",                 60], // admin mutations
  ["/api/v1",                    30], // external partner API
];

function tooManyRequests() {
  return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": "60" },
  });
}

// ── Routes that should be scoped per-user rather than per-IP ────────────────
// A single IP behind NAT could share a limit across many users. For expensive
// AI routes we key by the first 32 chars of the bearer token (a unique session
// fingerprint) so each authenticated user gets their own independent budget.
const USER_SCOPED_ROUTES = new Set([
  "/api/parent-ai",
  "/api/parent-insights",
  "/api/parent-recommendations",
  "/api/nimi",
]);

function rateLimitKey(req: NextRequest, prefix: string): string {
  if (USER_SCOPED_ROUTES.has(prefix)) {
    const auth = req.headers.get("authorization") ?? "";
    // "Bearer <token>" → take 32 chars of the token as a user fingerprint
    const fingerprint = auth.length > 7 ? auth.slice(7, 39) : "";
    if (fingerprint) return `user:${fingerprint}:${prefix}`;
  }
  return `${ip(req)}:${prefix}`;
}

// ── Session refresh helper ───────────────────────────────────────────────────
// Refreshes the Supabase cookie-based session on every matched request.
// This keeps JWTs valid without requiring the client to manually call
// refreshSession(), and allows middleware to read the current user if needed.
//
// IMPORTANT: this never does auth-based redirects for /admin routes.
// The admin check lives in client-side code (app/admin/page.tsx → checkAdmin).
// Adding middleware redirects for admin caused an infinite loop previously
// because localStorage sessions were invisible to middleware — now that we use
// cookie auth that root cause is fixed, but we still keep the check out of
// middleware to preserve the existing admin auth flow.
async function refreshSession(req: NextRequest, res: NextResponse): Promise<NextResponse> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    },
  );
  // getUser() triggers a token refresh if the access token is about to expire.
  await supabase.auth.getUser();
  return res;
}

// ── Proxy ────────────────────────────────────────────────────────────────────
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  // 1. Rate-limit sensitive API routes.
  // Mutations (POST/PUT/DELETE/PATCH) are rate-limited broadly.
  // A small set of GET routes that are enumeration-sensitive are also limited.
  // GET routes that need rate-limiting despite being reads:
  // - /api/referral/validate: public code lookup — enumeration risk
  // - /api/referral: authenticated code generation — prevent bulk code farming
  const GET_RATE_LIMITED = new Set(["/api/referral/validate", "/api/referral"]);
  const shouldLimit = (req.method !== "GET" && req.method !== "HEAD") || GET_RATE_LIMITED.has(pathname);
  if (shouldLimit) {
    for (const [prefix, max] of LIMITS) {
      if (pathname.startsWith(prefix)) {
        if (await rateLimited(rateLimitKey(req, prefix), max)) return tooManyRequests();
        break;
      }
    }
  }

  // Admin auth is handled client-side in app/admin/page.tsx (checkAdmin).
  // We intentionally do NOT add middleware-level admin redirects here — see
  // the comment in refreshSession() above.

  // 2. Refresh the Supabase session cookie so the JWT stays valid across page
  //    navigations without the client needing to call refreshSession() manually.
  return refreshSession(req, res);
}

export const config = {
  matcher: [
    // Session refresh: all page navigations except static assets, favicon, and
    // Next.js internal routes. This keeps JWT cookies valid between navigations.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    // Sensitive API prefixes (rate-limiting)
    "/api/newsletter",
    "/api/referral/validate",
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
    "/api/gift/:path*",
    "/api/gift",
    "/api/discount/:path*",
    "/api/certificate",
    "/api/masterpiece/:path*",
    "/api/auth/:path*",
    "/api/creations/:path*",
    "/api/v1/:path*",
    "/api/parent-ai",
    "/api/parent-insights",
    "/api/parent-recommendations",
    "/api/ai/:path*",
    "/api/nimi",
  ],
};
