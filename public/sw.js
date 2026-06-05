/**
 * Intela LXP Service Worker (fallback / reference)
 * NOTE: In production, vite-plugin-pwa generates a versioned workbox SW automatically.
 * This file is NOT registered by main.tsx to avoid stale-cache conflicts.
 *
 * Root cause of "Cannot read properties of null (reading 'useContext')":
 *   Stale-while-revalidate on JS modules causes React module graph inconsistencies.
 *   When some modules come from cache and others from network, React's internal
 *   dispatcher can be null → all hooks (useContext, useState, etc.) throw.
 *
 * Strategy:
 *  - JS / CSS / HTML  → Network-first (never serve stale — breaks React)
 *  - Images / fonts   → Cache-first (safe for binary/static assets)
 *  - Supabase API     → Network-only (always bypass cache)
 */
const CACHE_NAME = "intela-lxp-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(["/offline.html"]).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Delete ALL old caches (v1, etc.) to clear any stale JS modules
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Never intercept Supabase / Edge Function calls
  if (url.hostname.includes("supabase.co") || url.pathname.startsWith("/functions/")) return;

  const ext = url.pathname.split(".").pop()?.toLowerCase() ?? "";
  const isScript = ["js", "mjs", "ts", "jsx", "tsx"].includes(ext);
  const isStyle  = ext === "css";
  const isMarkup = ext === "html" || url.pathname === "/" || url.pathname.endsWith("/");

  if (isScript || isStyle || isMarkup) {
    // Network-first for all code assets — ensures fresh React modules on every load.
    // Only fall back to cache when truly offline.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached ?? caches.match("/offline.html"))
        )
    );
    return;
  }

  // Cache-first for images, fonts, icons (safe — binary content never breaks React)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match("/offline.html"));
    })
  );
});
