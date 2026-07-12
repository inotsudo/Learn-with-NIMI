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

const TTL_MS = 20_000; // 20 s — long enough to serve AppShell + page in one load

interface Entry { value: unknown; expires: number }

const store   = new Map<string, Entry>();
const pending = new Map<string, Promise<unknown>>();

export function qcached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() < hit.expires) return Promise.resolve(hit.value as T);

  const flying = pending.get(key);
  if (flying) return flying as Promise<T>;

  const promise = fn().then(value => {
    store.set(key, { value, expires: Date.now() + TTL_MS });
    pending.delete(key);
    return value;
  }).catch(err => {
    pending.delete(key);
    throw err;
  });

  pending.set(key, promise);
  return promise;
}

/** Remove all cache entries whose key starts with `prefix`. */
export function qinvalidate(prefix: string): void {
  for (const key of store.keys())   { if (key.startsWith(prefix)) store.delete(key); }
  for (const key of pending.keys()) { if (key.startsWith(prefix)) pending.delete(key); }
}
