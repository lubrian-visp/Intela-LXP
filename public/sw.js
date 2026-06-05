/**
 * Intela LXP Service Worker
 * Provides basic offline support by caching static assets and
 * returning a cached version when the network is unavailable.
 */
const CACHE_NAME = "intela-lxp-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Skip Supabase / API calls — always fresh
  const url = new URL(event.request.url);
  if (url.hostname.includes("supabase.co") || url.pathname.startsWith("/functions/")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fresh = fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
      // Return cached immediately, update in background (stale-while-revalidate)
      return cached || fresh.catch(() => caches.match("/offline.html"));
    })
  );
});
