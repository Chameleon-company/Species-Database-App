//Species Database Application Service Worker
//PWA Offline Support with Supabase Media Caching

const CACHE_NAME = "sba-cache-v2";
const MEDIA_CACHE_NAME = "sba-media-cache";

//Files that need to be cached
const FILES_TO_CACHE = [
    "/index.html",
    "/home.html",
    "/specie.html",
    "/imagepreview.html",
    "/language.html",
    "/login.html",
    "/tetum.html",
    "/tutorial.html",
    "/video.html",
    "/scripts/specieslist.js",
    "/scripts/imageCache.js",
    "/scripts/preloadImages.js",
    "/scripts/filterCarousel.js",
    "/scripts/config.js",
    "/scripts/db.js",
    "/scripts/bundleSync.js",
    "/scripts/sw-register.js",
    "/data/images.json"
];

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Caching static files');
            return cache.addAll(FILES_TO_CACHE).catch(err => {
                console.warn('[SW] Some files failed to cache:', err);
                // Continue even if some files fail
                return Promise.resolve();
            });
        })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME && k !== MEDIA_CACHE_NAME)
                    .map(k => {
                        console.log('[SW] Deleting old cache:', k);
                        return caches.delete(k);
                    })
            )
        )
    );
    self.clients.claim();
});

// Helper function to check if URL is a Supabase storage URL
function isSupabaseUrl(url) {
    return url.includes('supabase.co/storage') || 
           url.includes('supabase.in/storage') ||
           url.includes('supabase.com/storage');
}

// Helper function to check if URL is an external media URL
function isExternalMediaUrl(url) {
    return url.startsWith('http://') || url.startsWith('https://');
}

// Fetch event - handle requests with caching strategies
self.addEventListener('fetch', (event) => {
    const requestUrl = event.request.url;

    // Strategy for Supabase storage URLs (cache-first)
    if (isSupabaseUrl(requestUrl)) {
        event.respondWith(
            caches.open(MEDIA_CACHE_NAME).then(cache => {
                return cache.match(event.request).then(cachedResponse => {
                    if (cachedResponse) {
                        console.log('[SW] Supabase media from cache:', requestUrl);
                        return cachedResponse;
                    }

                    // Fetch and cache
                    return fetch(event.request).then(networkResponse => {
                        if (networkResponse.ok) {
                            cache.put(event.request, networkResponse.clone());
                            console.log('[SW] Cached Supabase media:', requestUrl);
                        }
                        return networkResponse;
                    }).catch(() => {
                        console.warn('[SW] Failed to fetch Supabase media:', requestUrl);
                        return new Response('', { status: 404, statusText: 'Not Found' });
                    });
                });
            })
        );
        return;
    }

    // Strategy for images (cache-first, then network)
    if (event.request.destination === "image") {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) {
                    return cached;
                }

                return fetch(event.request).then(response => {
                    if (response.ok) {
                        return caches.open(MEDIA_CACHE_NAME).then(cache => {
                            cache.put(event.request, response.clone());
                            return response;
                        });
                    }
                    return response;
                }).catch(() => {
                    // Return placeholder or 404 when offline
                    return new Response('', { status: 404, statusText: 'Not Found' });
                });
            })
        );
        return;
    }

    // Strategy for navigation and other requests (cache-first, fallback to network)
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) {
                return cached;
            }

            return fetch(event.request).then(response => {
                // Don't cache API calls or non-GET requests
                if (event.request.method !== 'GET' || requestUrl.includes('/api/')) {
                    return response;
                }

                // Cache successful responses
                if (response.ok) {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                }

                return response;
            }).catch(() => {
                // Offline fallback for navigation
                if (event.request.mode === "navigate") {
                    return caches.match('/index.html');
                }
                return new Response('', { status: 404, statusText: 'Not Found' });
            });
        })
    );
});

// Message event - handle messages from main thread
self.addEventListener("message", async (event) => {
    const { type } = event.data;

    // Handle CACHE_IMAGES message (legacy support)
    if (type === "CACHE_IMAGES") {
        try {
            const cache = await caches.open(MEDIA_CACHE_NAME);
            const images = event.data.images || [];
            
            if (images.length > 0) {
                await cache.addAll(images);
                console.log(`[SW] Cached ${images.length} images`);
            }
        } catch (error) {
            console.error('[SW] Error caching images:', error);
        }
        return;
    }

    // Handle CACHE_MEDIA message (new - for Supabase URLs)
    if (type === "CACHE_MEDIA") {
        try {
            const cache = await caches.open(MEDIA_CACHE_NAME);
            const urls = event.data.urls || [];
            
            console.log(`[SW] Received ${urls.length} media URLs to cache`);

            let cached = 0;
            let failed = 0;

            for (const url of urls) {
                if (!url || !isExternalMediaUrl(url)) {
                    continue;
                }

                try {
                    // Check if already cached
                    const existing = await cache.match(url);
                    if (existing) {
                        cached++;
                        continue;
                    }

                    // Fetch and cache
                    const response = await fetch(url, { mode: 'cors' });
                    if (response.ok) {
                        await cache.put(url, response);
                        cached++;
                    } else {
                        failed++;
                    }
                } catch (err) {
                    console.warn(`[SW] Failed to cache: ${url}`, err.message);
                    failed++;
                }
            }

            console.log(`[SW] Media caching complete: ${cached} cached, ${failed} failed`);

            // Notify clients of completion
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'CACHE_MEDIA_COMPLETE',
                    cached: cached,
                    failed: failed,
                    total: urls.length
                });
            });

        } catch (error) {
            console.error('[SW] Error in CACHE_MEDIA:', error);
        }
        return;
    }

    // Handle CLEAR_CACHE message
    if (type === "CLEAR_CACHE") {
        try {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
            console.log('[SW] All caches cleared');
        } catch (error) {
            console.error('[SW] Error clearing caches:', error);
        }
        return;
    }

    // Handle GET_CACHE_STATUS message
    if (type === "GET_CACHE_STATUS") {
        try {
            const staticCache = await caches.open(CACHE_NAME);
            const mediaCache = await caches.open(MEDIA_CACHE_NAME);
            
            const staticKeys = await staticCache.keys();
            const mediaKeys = await mediaCache.keys();

            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'CACHE_STATUS',
                    staticFiles: staticKeys.length,
                    mediaFiles: mediaKeys.length
                });
            });
        } catch (error) {
            console.error('[SW] Error getting cache status:', error);
        }
        return;
    }
});

console.log('[SW] Service Worker loaded');