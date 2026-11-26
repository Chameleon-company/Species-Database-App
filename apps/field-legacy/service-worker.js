// service-worker.js - PWA Offline Support
// App files are network-first: inside the Android app the "network" is the APK's own local
// server (always there, always the installed version); on the website it is the live site.
// The cache is only the offline fallback, so a new release is never hidden behind old files.
const CACHE_NAME = "species-app-v14";
// Media cached by older versions (bulk download). Kept read-only so it still works offline;
// pages move its images into IndexedDB image_blobs, the one media store, as they use them.
const MEDIA_CACHE = "media-cache-v10";
// species-app-v13 and older served app files cache-first, so pages open at update time run old code.
const LAST_CACHE_FIRST_VERSION = 13;

const CORE_ASSETS = [
  "./index.html",
  "./home.html",
  "./tetum.html",
  "./specie.html",
  "./specie_tetum.html",
  "./video.html",
  "./login.html",
  "./login_tetum.html",
  "./language.html",
  "./manifest.json",
  "./css/layout.css",
  "./css/responsive.css",
  "./css/filters.css",
  "./css/cards.css",
  "./css/onlineBanner.css",
  "./scripts/config.js",
  "./scripts/language.js",
  "./js/login.js",
  "./scripts/db.js",
  "./scripts/dataService.js",
  "./scripts/imageCache.js",
  "./scripts/videoCache.js",
  "./scripts/video.js",
  "./scripts/sync.js",
  "./scripts/specieslist.js",
  "./scripts/filterCarousel.js",
  "./scripts/detectOnline.js",
  "./scripts/sw-register.js",
  "./js/general.js",
  "./Assets/icons/leftarrow.png",
  "./Assets/icons/heart.png",
  "./Assets/icons/placeholderImageOffline.png",
  "./Assets/icons/videoCloudIcon.png",
  "./Assets/icons/videoCachedIcon.png",
  "./Assets/icons/videoPlaceholder.jpg",
  "./Assets/icons/search.svg",
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

// Activate - delete every cache this version does not use
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...",CACHE_NAME);
  event.waitUntil((async () => {
    let replacedCacheFirst = false;
    for (const key of await caches.keys()) {
      if (key === CACHE_NAME || key === MEDIA_CACHE) continue;
      const old = /^species-app-v(\d+)$/.exec(key);
      if (old && Number(old[1]) <= LAST_CACHE_FIRST_VERSION) replacedCacheFirst = true;
      await caches.delete(key);
    }
    await self.clients.claim();

    // Pages open right now were served from the old cache-first worker's cache (old code).
    // Reload them once so they run the new version. Not awaited: the reload's own request waits
    // for this worker to finish activating, so waiting for it here would deadlock.
    if (replacedCacheFirst) {
      const windows = await self.clients.matchAll({ type: "window" });
      windows.forEach((client) => client.navigate(client.url).catch(() => null));
    }
  })());
});

// Fetch
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // App files: network first, cache as offline fallback
  if (url.origin === location.origin) {
    event.respondWith(handleAppRequest(request));
    return;
  }

  // Cross-origin images (Supabase storage) shown with a plain <img src>
  if (request.destination === "image") {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Everything else (API calls, videos, fonts) goes straight to the network.
  // Videos are played from IndexedDB blobs (Download button) or streamed directly.
});

// Navigations are cached by path, so specie.html?id=1 and ?id=2 share one copy
function appCacheKey(request) {
  if (request.mode !== "navigate") return request;
  const url = new URL(request.url);
  return url.origin + url.pathname;
}

// Network-first for app files
async function handleAppRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const key = appCacheKey(request);

  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      cache.put(key, response.clone()).catch(() => {});
    }
    return response;
  }
  catch (e) {
    const cached = await cache.match(key, { ignoreSearch: request.mode === "navigate" });
    if (cached) return cached;

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

      if (url.pathname.endsWith("/")) {
        const fallback = await cache.match("./index.html");
        if (fallback) return fallback;
      }
      //If all else fails return to home
      const fallback = await cache.match("./home.html");
      if (fallback) return fallback;
    }

    return new Response("Offline", {status: 503,headers: {"Content-Type": "text/plain"}});
  }
}

// Images: old media cache, then the IndexedDB copy the app stores, then the network.
// Nothing is added to Cache Storage here, so each image is stored once (image_blobs).
async function handleImageRequest(request) {
  try {
    const cached = await caches.open(MEDIA_CACHE).then((cache) => cache.match(request));
    if (cached) return cached;
  } catch (e) {
    // fall through
  }

  const blob = await getStoredImage(request.url);
  if (blob) {
    return new Response(blob, { headers: { "Content-Type": blob.type || "application/octet-stream" } });
  }

  try {
    return await fetch(request);
  } catch (e) {
    return new Response("", { status: 503 });
  }
}

// Read an image blob from the app's IndexedDB (species_db / image_blobs). Never creates the
// database and closes the connection straight away so it cannot block a schema upgrade.
function getStoredImage(url) {
  return new Promise((resolve) => {
    let open;
    try {
      open = indexedDB.open("species_db");
    } catch (e) {
      resolve(null);
      return;
    }
    open.onupgradeneeded = () => open.transaction.abort(); // database does not exist yet
    open.onerror = () => resolve(null);
    open.onblocked = () => resolve(null);
    open.onsuccess = () => {
      const database = open.result;
      try {
        if (!database.objectStoreNames.contains("image_blobs")) {
          database.close();
          resolve(null);
          return;
        }
        const get = database.transaction("image_blobs", "readonly").objectStore("image_blobs").get(url);
        get.onsuccess = () => {
          database.close();
          const blob = get.result && get.result.blob;
          resolve(blob && blob.size > 0 ? blob : null);
        };
        get.onerror = () => {
          database.close();
          resolve(null);
        };
      } catch (e) {
        database.close();
        resolve(null);
      }
    };
  });
}

console.log("[SW] Service Worker loaded");
