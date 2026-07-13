import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
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
  ["/api/confirm-payment",       10], // payment confirmation
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
        if (await rateLimited(`${clientIp}:${prefix}`, max)) return tooManyRequests();
        break;
      }
    }
  }

  // Admin auth is handled client-side in app/admin/page.tsx (checkAdmin).
  // Middleware cannot read the session because the app uses localStorage-based
  // auth (supabase-js), not cookies — a middleware session check would always
  // see no session and create an infinite redirect loop.

  return res;
}

export const config = {
  matcher: [
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
