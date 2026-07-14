/**
 * Lightweight in-memory read cache for Supabase queries.
 *
 * Two layers of deduplication:
 *  1. In-flight: if two callers request the same key concurrently, only one
 *     network request fires — both receive the same Promise.
 *  2. TTL: completed results are reused for `TTL_MS` before re-fetching.
 *
 * Usage:
 *   return qcached(`weekStreak:${childId}:${lang}`, () => supabase…);
 *
 * Invalidation (call after mutations that change the cached data):
 *   qinvalidate(`weekStreak:${childId}`);  // prefix match
 *   qinvalidate(`child:${childId}`);       // or a broader prefix
 */

// Short TTL for per-user data that changes during a session (progress, streaks).
// Long TTL for stable catalogue data that only changes when admins update content.
export const TTL_SHORT = 20_000;        // 20 s
export const TTL_LONG  = 5 * 60_000;   // 5 min

interface Entry { value: unknown; expires: number }

const store   = new Map<string, Entry>();
const pending = new Map<string, Promise<unknown>>();

export function qcached<T>(key: string, fn: () => Promise<T>, ttl = TTL_SHORT): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() < hit.expires) return Promise.resolve(hit.value as T);

  const flying = pending.get(key);
  if (flying) return flying as Promise<T>;

  const promise = fn().then(value => {
    store.set(key, { value, expires: Date.now() + ttl });
    pending.delete(key);
    return value;
  }).catch(err => {
    pending.delete(key);
    throw err;
  });

  pending.set(key, promise);
  return promise;
}

/** Remove all in-memory cache entries whose key starts with `prefix`. */
export function qinvalidate(prefix: string): void {
  for (const key of store.keys())   { if (key.startsWith(prefix)) store.delete(key); }
  for (const key of pending.keys()) { if (key.startsWith(prefix)) pending.delete(key); }
}

/** Remove all localStorage cache entries whose key starts with `prefix`. */
export function lsinvalidate(prefix: string): void {
  if (typeof window === "undefined") return;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) localStorage.removeItem(k);
  }
}

/**
 * localStorage-backed cache — survives full page reloads.
 * Falls back gracefully when localStorage is unavailable (SSR, private mode).
 * Use for stable data (products, geo) that shouldn't re-fetch on every reload.
 */
export function lscached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const entry = JSON.parse(raw) as { value: T; expires: number };
        if (Date.now() < entry.expires) return Promise.resolve(entry.value);
      }
    } catch { /* corrupt — fall through to re-fetch */ }
  }
  return fn().then(value => {
    if (typeof window !== "undefined") {
      try { localStorage.setItem(key, JSON.stringify({ value, expires: Date.now() + ttl })); } catch { /* storage full */ }
    }
    return value;
  });
}
