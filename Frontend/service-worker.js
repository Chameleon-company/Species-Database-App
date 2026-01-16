//Species Database Application Service Worker (Needs more work done)

const CACHE_NAME = "sba-cache";

//Files that need to be cahced
const FILES_TO_CACHE = [
    "/index.html",
    "/home.html",
    "/specie.html",
    "imagepreview.html",
    "/scripts/specieslist.js",
    "/scripts/imageCache.js",
    "/scripts/preloadImages.js",
    "/scripts/filterCarousel.js",
    "/data/images.json"
];

self.addEventListener('install', (event) => {
    console.log('Service Worker installed');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log("Caching files");
            return cache.addAll(FILES_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
            caches.match(event.request).then(cached =>{
                if (cached) return cached;

                return fetch(event.request).then(response => {
                    if (event.request.destination === "image") {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, response.clone());
                         return response;
                    });
                }
                return response;
            }).catch(() => {
                //fallback when offline
                if (event.request.destination === "image") {
                    return caches.match(event.request) || new Response('', {status:404});
                }
                if (event.request.mode === "navigate") {
                    return caches.match(event.request)
                }
            });
        })
    );
});

self.addEventListener("message", async event => {
    if (event.data?.type === "CACHE_IMAGES"){
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(event.data.images);
        console.log(`Cached ${event.data.images.length} images`);
    }
});