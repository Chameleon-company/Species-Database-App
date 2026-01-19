// service-worker.js - PWA Offline Support
const CACHE_NAME = "species-app-v1";
const MEDIA_CACHE = "media-cache-v1";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./home.html",
  "./specie.html",
  "./manifest.json",
  "./css/responsive.css",
  "./scripts/specieslist.js",
  "./scripts/filterCarousel.js",
];

// Install - cache core assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of CORE_ASSETS) {
        try {
          const res = await fetch(url, { cache: "no-cache" });
          if (res.ok) await cache.put(url, res);
        } catch (e) {
          console.warn("[SW] Failed to cache:", url);
        }
      }
      console.log("[SW] Core assets cached");
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME && k !== MEDIA_CACHE) {
            return caches.delete(k);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Handle Supabase storage URLs (images/videos)
  if (url.hostname.includes("supabase.co") && url.pathname.includes("/storage/")) {
    event.respondWith(handleMediaRequest(event.request));
    return;
  }

  // Handle same-origin requests
  if (url.origin === location.origin) {
    event.respondWith(handleAppRequest(event.request));
    return;
  }
});

// Cache-first for media
async function handleMediaRequest(request) {
  const cache = await caches.open(MEDIA_CACHE);
  
  const cached = await cache.match(request);
  if (cached) {
    console.log("[SW] Media from cache:", request.url);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return new Response("", { status: 503 });
  }
}

// Cache-first for app files
async function handleAppRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && request.method === "GET") {
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    if (request.mode === "navigate") {
      return cache.match("./home.html") || cache.match("./index.html");
    }
    return new Response("Offline", { status: 503 });
  }
}

// Message handler - cache media URLs
self.addEventListener("message", async (event) => {
  const { type, urls } = event.data;

  if (type === "CACHE_MEDIA" && Array.isArray(urls)) {
    console.log("[SW] Caching", urls.length, "media URLs");
    const cache = await caches.open(MEDIA_CACHE);
    
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) await cache.put(url, res);
      } catch (e) {
        console.warn("[SW] Failed to cache media:", url);
      }
    }
    console.log("[SW] Media caching complete");
  }
});

console.log("[SW] Service Worker loaded");