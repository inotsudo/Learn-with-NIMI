// ── Distributed cache for parent AI routes ────────────────────────
// Wraps Upstash Redis when available; falls back to an in-process Map.
// The Map fallback resets on cold start and is per-isolate; Redis is
// coordinated across all Vercel instances.
//
// Usage:
//   const cache = new KvCache<MyEntry>('ai-cache', 4 * 60 * 60);
//   const hit = await cache.get(key);
//   await cache.set(key, value);

import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    _redis = new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return _redis;
}

export class KvCache<T> {
  private readonly prefix:   string;
  private readonly ttlSec:   number;
  private readonly fallback = new Map<string, { value: T; expiresAt: number }>();

  constructor(prefix: string, ttlSeconds: number) {
    this.prefix  = `nimipiko:${prefix}`;
    this.ttlSec  = ttlSeconds;
  }

  async get(key: string): Promise<T | null> {
    const redis = getRedis();
    if (redis) {
      try {
        const raw = await redis.get<T>(`${this.prefix}:${key}`);
        return raw ?? null;
      } catch {
        // Redis unavailable — fall through to in-memory
      }
    }
    const entry = this.fallback.get(key);
    if (!entry || Date.now() > entry.expiresAt) return null;
    return entry.value;
  }

  async set(key: string, value: T): Promise<void> {
    const redis = getRedis();
    if (redis) {
      try {
        await redis.set(`${this.prefix}:${key}`, value, { ex: this.ttlSec });
        return;
      } catch {
        // Redis unavailable — fall through to in-memory
      }
    }
    this.fallback.set(key, { value, expiresAt: Date.now() + this.ttlSec * 1000 });
  }

  async del(key: string): Promise<void> {
    const redis = getRedis();
    if (redis) {
      try {
        await redis.del(`${this.prefix}:${key}`);
      } catch { /* best-effort */ }
    }
    this.fallback.delete(key);
  }
}
