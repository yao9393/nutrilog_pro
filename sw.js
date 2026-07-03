// NutriLog Pro service worker
// Strategy: NETWORK-FIRST for the app shell (index.html) so your Cloudflare
// deployments reach users immediately; the cached copy is only used offline.
// Static assets (icons/manifest) are cache-first. Cross-origin requests
// (Supabase, Gemini, CDNs, fonts) are left alone — always live network.
//
// Bump CACHE_VERSION whenever you want to force-refresh everything cached.
const CACHE_VERSION = "nutrilog-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests — Supabase/Gemini/CDN traffic passes through untouched.
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  // App navigation (opening the app): network-first, cache fallback for offline.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put("/index.html", copy));
          return res;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Static assets: cache-first, then network (and cache the result).
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          return res;
        })
    )
  );
});
