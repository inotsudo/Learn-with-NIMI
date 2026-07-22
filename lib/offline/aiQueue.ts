// lib/offline/aiQueue.ts — Offline AI request queue
//
// When an AI call fails because the device is offline, callers can enqueue
// the request. The queue is persisted in localStorage and flushed when the
// device comes back online.
//
// This complements the existing offlineQueue.ts (mission completions) and
// offlineSlotQueue.ts (slot completions) — same pattern, different payload type.

export interface QueuedAIRequest {
  id:        string;
  type:      string;
  endpoint:  string;          // e.g. '/api/nimi', '/api/coloring-coach'
  body:      Record<string, unknown>;
  queuedAt:  number;
  retries:   number;
}

const QUEUE_KEY  = 'nimi_offline_ai_queue';
const MAX_RETRIES = 3;
const MAX_AGE_MS  = 24 * 60 * 60 * 1000; // discard after 24 h

// ── Queue CRUD ────────────────────────────────────────────────────────────────

function read(): QueuedAIRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as QueuedAIRequest[];
  } catch { return []; }
}

function write(q: QueuedAIRequest[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch { /* storage full */ }
}

export function enqueueAIRequest(
  endpoint: string,
  body:     Record<string, unknown>,
  type      = 'unknown',
): string {
  const id  = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const q   = read().filter(r => Date.now() - r.queuedAt < MAX_AGE_MS);
  q.push({ id, type, endpoint, body, queuedAt: Date.now(), retries: 0 });
  write(q);
  return id;
}

export function dequeueAll(): QueuedAIRequest[] {
  const q = read().filter(r => Date.now() - r.queuedAt < MAX_AGE_MS);
  write([]);
  return q;
}

export function requeueFailed(failed: QueuedAIRequest[]): void {
  const surviving = failed
    .map(r => ({ ...r, retries: r.retries + 1 }))
    .filter(r => r.retries <= MAX_RETRIES);
  const current = read().filter(r => Date.now() - r.queuedAt < MAX_AGE_MS);
  write([...current, ...surviving]);
}

export function pendingCount(): number {
  return read().filter(r => Date.now() - r.queuedAt < MAX_AGE_MS).length;
}

export function clearQueue(): void {
  write([]);
}

// ── flushAIQueue ──────────────────────────────────────────────────────────────
// Call this when the device comes back online.
// Expects a token-fetching function so this module stays auth-agnostic.

export async function flushAIQueue(
  getToken: () => string | null,
): Promise<{ flushed: number; failed: number }> {
  const pending = dequeueAll();
  if (pending.length === 0) return { flushed: 0, failed: 0 };

  const token   = getToken();
  let flushed   = 0;
  const failed: QueuedAIRequest[] = [];

  for (const req of pending) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(req.endpoint, {
        method:  'POST',
        headers,
        body:    JSON.stringify(req.body),
      });

      if (res.ok) {
        flushed++;
      } else if (res.status >= 400 && res.status < 500) {
        // 4xx — don't retry (bad request, wrong data)
        console.warn(`[aiQueue] ${req.endpoint} 4xx — discarding`);
      } else {
        failed.push(req);
      }
    } catch {
      failed.push(req);
    }
  }

  if (failed.length > 0) requeueFailed(failed);
  return { flushed, failed: failed.length };
}

// ── useAIQueueSync — React hook ───────────────────────────────────────────────
// Attaches an online listener and flushes the queue when connectivity resumes.

export function registerOnlineSync(getToken: () => string | null): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = () => {
    if (pendingCount() > 0) {
      void flushAIQueue(getToken);
    }
  };

  window.addEventListener('online', handler);
  // Also try immediately in case we're already online with a stale queue
  if (navigator.onLine && pendingCount() > 0) {
    void flushAIQueue(getToken);
  }

  return () => window.removeEventListener('online', handler);
}
