//Save image as blob obejct (resolves only once the write has committed)
async function saveImageBlob(url,speciesId,blob) {
    const database = await window.db.init();

    return new Promise((resolve,reject) => {
        const tx = database.transaction(['image_blobs'],'readwrite');
        const store = tx.objectStore('image_blobs');

        store.put({
            url: url,
            species_id: speciesId,
            blob: blob,
            cachedAt: new Date().toISOString()
        });

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

//Load the image from the db
async function getCachedImage(url) {
    const database = await window.db.init();

    return new Promise((resolve,reject) => {
        const tx = database.transaction(['image_blobs'],'readonly');
        const store = tx.objectStore('image_blobs');

        const request = store.get(url);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

//Cache the image. Returns the blob, or null if it could not be fetched.
//Pages that load sync.js use its cacheImageBlob instead (shared with the background prefetch).
async function cacheImage(url,speciesId) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {throw new Error(`Image fetch failed: ${response.status}`);}

        const blob = await response.blob();
        if (!blob || blob.size === 0) {throw new Error("Image blob is empty");}

        await saveImageBlob(url,speciesId,blob).catch((err) => console.warn("[ImageCache] Not stored:", url, err));

        console.log("[ImageCache] Cached:",url);
        return blob;
    }
    catch (err) {
        console.log("[ImageCache] Failed:",url,err);
        return null;
    }
    finally {clearTimeout(timer);}
}

//Image from the service worker media cache (filled by older app versions), or null
async function getImageFromCacheStorage(url) {
    if (!("caches" in window)) {return null;}
    try {
        const response = await caches.match(url);
        if (!response || !response.ok) {return null;}
        const blob = await response.blob();
        return blob.size > 0 ? blob : null;
    } catch (err) {return null;}
}

//Load the image from cache (load from cache if available, otherwise need to sync)
async function loadImageWithCache(imgElement,url,speciesId) {
    const placeholder = "Assets/icons/placeholderImageOffline.png";

    if (!url || /\.(mp4|mov|webm|avi)$/i.test(url)) {imgElement.src = placeholder;return;}

    imgElement.src = placeholder; //set as placeholder to begin with
    let cached = null;
    try {cached = await getCachedImage(url);}
    catch (err) {console.warn("[ImageCache] IndexedDB read failed:", url, err);}

    if (cached && cached.blob) {
        console.log("[ImageCache] Loaded from IndexedDB:", url);
        imgElement.src = URL.createObjectURL(cached.blob);
        return;
    }

    //Not stored yet: try the service worker media cache, then the network, and store it for offline use.
    //Concurrent requests for the same URL share one download.
    let blob = null;
    if (typeof window.cacheImageBlob === "function") {
        const result = await window.cacheImageBlob(url, speciesId);
        blob = result ? result.blob : null;
    } else {
        blob = (await getImageFromCacheStorage(url)) || (await cacheImage(url, speciesId));
    }

    if (blob) {
        imgElement.src = URL.createObjectURL(blob);
        console.log("[ImageCache] Cached and displayed:", url);
        return;
    }

    console.warn("[ImageCache] No cache and online fetch failed:", url);
    imgElement.src = placeholder; //If there is no cached image just use placehodler image
    imgElement.alt = "Offline: image unavailable";
}



document.addEventListener("DOMContentLoaded", () => {
    const stored = localStorage.getItem("selected_species");
    if(!stored) return;

    const species = JSON.parse(stored);
});

window.saveImageBlob = saveImageBlob;
window.getCachedImage = getCachedImage;
window.cacheImage = cacheImage;
window.loadImageWithCache = loadImageWithCache;