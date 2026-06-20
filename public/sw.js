// NIMIPIKO — service worker: web push + offline media/static caching

const MEDIA_CACHE = "nimi-media-v1";
const STATIC_CACHE = "nimi-static-v1";
const PAGE_CACHE = "nimi-pages-v1";
const CURRENT_CACHES = [MEDIA_CACHE, STATIC_CACHE, PAGE_CACHE];

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
        } catch (err) {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          throw err;
        }
      })
    );
    return;
  }

  const url = event.request.url;
  const isSupabaseMedia = url.includes("/storage/v1/object/public/");
  const isNextStatic = url.includes("/_next/static/");
  if (!isSupabaseMedia && !isNextStatic) return;

  const cacheName = isSupabaseMedia ? MEDIA_CACHE : STATIC_CACHE;
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
