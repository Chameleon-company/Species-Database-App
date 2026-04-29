// service-worker.js - PWA Offline Support
const CACHE_NAME = "species-app-v3";
const MEDIA_CACHE = "media-cache-v3";

const CORE_ASSETS = [
  "./index.html",
  "./home.html",
  "./tetum.html",
  "./specie.html",
  "./video.html",
  "./manifest.json",
  "./css/layout.css",
  "./css/responsive.css",
  "./css/filters.css",
  "./css/cards.css",
  "./scripts/config.js",
  "./scripts/db.js",
  "./scripts/dataService.js",
  "./scripts/sync.js",
  "./scripts/specieslist.js",
  "./scripts/filterCarousel.js",
  "./scripts/detectOnline.js",
  "./scripts/sw-register.js",
  "./js/general.js",
  "./Assets/icons/leftarrow.png",
  "./Assets/icons/heart.png",
];

// Install - cache core assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...",CACHE_NAME);
  self.skipWaiting();
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
});

// Activate - clean old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...",CACHE_NAME);
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys.map((k) => {
            if (k !== CACHE_NAME && k !== MEDIA_CACHE) {
              return caches.delete(k);
            }
          })
        )
      ),
      self.clients.claim()
    ])
  );
});

// Fetch - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Handle Supabase storage URLs (images/videos)
  if (event.request.destination === "image" || event.request.destination === "video") {
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
      await cache.put(request, response.clone());
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
  }
  catch (e) {
    if (request.mode === "navigate") {
      //additional fallbacks for home and species pages +video (both can load from cached data) and both must be accessible offline
      const url = new URL(request.url);

      if (url.pathname.endsWith("/specie.html")) {
        const fallback = await cache.match("./specie.html");
        if (fallback) return fallback;
      }

      if (url.pathname.endsWith("/home.html")) {
        const fallback = await cache.match("./home.html");
        if (fallback) return fallback;
      }

      if (url.pathname.endsWith("/tetum.html")) {
        const fallback = await cache.match("./tetum.html");
        if (fallback) return fallback;
      }

      if (url.pathname.endsWith("/video.html")) {
        const fallback = await cache.match("./video.html");
        if (fallback) return fallback;
      }
      //If all else fails return to home
      const fallback = await cache.match("./home.html");
      if (fallback) return fallback;
      }

      return new Response("Offline", {status: 503,headers: {"Content-Type": "text/plain"}
      });
  }
}


//helper for sending from SW toopen app tabs
async function notifyClients(message) {
  //get all pages controlled by SW
  const clients =await self.clients.matchAll({
    includeUncontrolled: true
  }) 
  
  //sendig messager to each page
  for(const client of clients)
  {
    client.postMessage(message)
  }
}

//message handler - cache media URLs
self.addEventListener("message", async (event) => {
  const { type, urls } = event.data;

  if (type === "CACHE_MEDIA" && Array.isArray(urls)) {
    console.log("[SW] Caching", urls.length, "media URLs");
    const cache = await caches.open(MEDIA_CACHE);

    //keepig track of medai cache progress
    let done = 0
    const total = urls.length

    for (const url of urls) {
      try {

        const req = new Request(url, {cache: "no-store"})
        //skipping if cached
        const cached = await cache.match(req)
        if(!cached)
        {
          const res = await fetch(url);
          if (res.ok) await cache.put(url, res.clone());
        }
        done++
        notifyClients({type: "MEDIA_CACHE_PROGRESS", done, total,url})

      } catch (e) {
        done++
        notifyClients({type: "MEDIA_CACHE_PROGRESS", done, total,url,error: true})
      }
    }
    notifyClients({type: "MEDIA_CACHE_DONE",total})
  }
});

console.log("[SW] Service Worker loaded");
