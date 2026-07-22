// NIMIPIKO — service worker: web push + offline media/static + AI response caching

const MEDIA_CACHE  = "nimi-media-v1";
const STATIC_CACHE = "nimi-static-v6";
const PAGE_CACHE   = "nimi-pages-v6";
const AI_CACHE     = "nimi-ai-v1";       // deterministic AI response cache
const CURRENT_CACHES = [MEDIA_CACHE, STATIC_CACHE, PAGE_CACHE, AI_CACHE];
const OFFLINE_PAGE = "/offline.html";

// AI routes whose responses can be safely cached (read-only, deterministic-ish).
// Auth routes, event logging, and streaming routes are never cached.
const CACHEABLE_AI_ROUTES = new Set([
  "/api/v1/content/stories",
  "/api/creativity-challenges",
  "/api/coloring-coach",
  "/api/drawing-coach",
]);
const AI_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Pre-cache the offline fallback on install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE).then((cache) => cache.add(OFFLINE_PAGE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => !CURRENT_CACHES.includes(name))
          .map((name) => caches.delete(name))
      )
    )
  );
});

// Cache-first for already-published lesson media (audio/video/images) and
// this build's static chunks, so a previously-viewed mission keeps working
// with no signal. Page documents use network-first-falling-back-to-cache so
// a reload/reopen with zero connectivity still boots the app shell from the
// last successful visit. Everything else (auth, Supabase RPC writes, our
// own API routes) passes straight through to the network untouched.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.open(PAGE_CACHE).then(async (cache) => {
        try {
          const res = await fetch(event.request);
          if (res.ok) cache.put(event.request, res.clone());
          return res;
        } catch {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          // Last resort: serve the offline placeholder page
          const offline = await caches.match(OFFLINE_PAGE);
          return offline ?? Response.error();
        }
      })
    );
    return;
  }

  const url     = event.request.url;
  const urlObj  = new URL(url);
  const isSupabaseMedia = url.includes("/storage/v1/object/public/");
  const isStaticChunk   = url.includes("/_next/static/") && !url.includes("localhost");

  // ── AI response cache (network-first, stale-while-revalidate for GET) ────────
  if (event.request.method === "GET" && CACHEABLE_AI_ROUTES.has(urlObj.pathname)) {
    event.respondWith(
      caches.open(AI_CACHE).then(async (cache) => {
        const cacheKey = event.request.url;
        const cached   = await cache.match(cacheKey);

        // Check TTL on cached entry
        if (cached) {
          const cachedAt = parseInt(cached.headers.get("X-Cached-At") ?? "0", 10);
          if (Date.now() - cachedAt < AI_CACHE_TTL_MS) return cached;
        }

        try {
          const res = await fetch(event.request);
          if (res.ok) {
            // Clone and stamp with cache time
            const stamped = new Response(res.clone().body, {
              status:  res.status,
              headers: new Headers({
                ...Object.fromEntries(res.headers),
                "X-Cached-At": String(Date.now()),
              }),
            });
            cache.put(cacheKey, stamped);
          }
          return res;
        } catch {
          if (cached) return cached;
          return Response.error();
        }
      })
    );
    return;
  }

  if (!isSupabaseMedia && !isStaticChunk) return;

  const cacheName = isStaticChunk ? STATIC_CACHE : MEDIA_CACHE;
  event.respondWith(
    caches.open(cacheName).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const res = await fetch(event.request);
        if (res.ok) cache.put(event.request, res.clone());
        return res;
      } catch (err) {
        if (cached) return cached;
        throw err;
      }
    })
  );
});

// ── Message: client requests AI cache invalidation ────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_AI_CACHE") {
    caches.delete(AI_CACHE).then(() => {
      event.ports[0]?.postMessage({ ok: true });
    });
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "NIMIPIKO", body: "You have a new notification!", url: "/" };
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/nimi-logo-circle.png",
      badge: "/nimi-logo-circle.png",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
