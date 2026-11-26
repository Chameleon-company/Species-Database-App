/************************************************************************
//Functions for caching and loading videos
//Split this to another file so it can be used outside of video page (video availability icons)
//
*************************************************************************/

//Save video as blob obejct. Resolves only once the write has committed, so a full
//disk (QuotaExceededError, reported when the transaction aborts) is a failure, not a success.
async function saveVideoBlob(url,speciesId,blob) {
    const database = await window.db.init();

    return new Promise((resolve,reject) => {
        const tx = database.transaction(['video_blobs'],'readwrite');
        const store = tx.objectStore('video_blobs');

        store.put({
            url: url,
            species_id: speciesId,
            blob: blob,
            cachedAt: new Date().toISOString()
        });
        console.log("[SAVE URL]", url);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error || new Error("Could not store video"));
        tx.onabort = () => reject(tx.error || new Error("Storing video aborted"));
    });
}

//Load the video saved by the Download button (IndexedDB video_blobs)
async function getStoredVideo(url) {
    const database = await window.db.init();

    return new Promise((resolve,reject) => {
        const tx = database.transaction(['video_blobs'],'readonly');
        const store = tx.objectStore('video_blobs');

        const request = store.get(url);
        console.log("[GET URL]", url);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

//Load the video from the db, or from the service worker media cache that older app
//versions filled, so a video already on the device is never downloaded again.
async function getCachedVideo(url) {
    const stored = await getStoredVideo(url);
    if (stored?.blob) {return stored;}

    if ("caches" in window) {
        try {
            const response = await caches.match(url);
            if (response && response.ok) {
                const blob = await response.blob();
                if (blob.size > 0) {return { url: url, blob: blob, fromCacheStorage: true };}
            }
        } catch (err) {console.warn("[Video] Cache Storage read failed:", err);}
    }
    return null;
}

//Cache the video. Returns the stored blob; THROWS when the download or the save failed,
//so the page never reports a video as downloaded when it is not on the device.
//onProgress(receivedBytes, totalBytesOrNull) is optional.
async function cacheVideo(url,speciesId,onProgress) {
    const controller = new AbortController();
    const STALL_MS = 30000; //give up when no data arrives for 30 s
    let stallTimer = setTimeout(() => controller.abort(), STALL_MS);
    const touch = () => {
        clearTimeout(stallTimer);
        stallTimer = setTimeout(() => controller.abort(), STALL_MS);
    };

    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {throw new Error(`Video fetch failed: ${response.status}`);}

        const total = Number(response.headers.get("Content-Length")) || null;
        let blob;
        if (response.body && typeof response.body.tee === "function") {
            //One branch counts bytes (progress + stall detection), the other becomes the blob
            const [counted, kept] = response.body.tee();
            const blobPromise = new Response(kept).blob();
            const reader = counted.getReader();
            let received = 0;
            for (;;) {
                const { done, value } = await reader.read();
                if (done) {break;}
                received += value.byteLength;
                touch();
                if (onProgress) {onProgress(received, total);}
            }
            blob = await blobPromise;
        } else {
            blob = await response.blob();
        }

        if (!blob || blob.size === 0) {throw new Error("Video blob is empty");}
        //(less than Content-Length = cut off; more is fine, a compressed transfer decodes larger)
        if (total && blob.size < total) {throw new Error(`Video incomplete: ${blob.size} of ${total} bytes`);}

        await saveVideoBlob(url,speciesId,blob);

        //Check it is really there before telling the user it is saved
        const saved = await getStoredVideo(url);
        if (!saved?.blob || saved.blob.size !== blob.size) {throw new Error("Video was not saved");}

        console.log("[Video] Cached:",url);
        return saved.blob;
    }
    catch (err) {
        console.log("[Video] Failed:",url,err);
        if (err && err.name === "AbortError") {throw new Error("Download stalled - check your connection");}
        throw err;
    }
    finally {clearTimeout(stallTimer);}
}


//Load the video from cache (load from cache if available, otherwise need to sync)
async function loadVideoWithCache(url,speciesId) {
    const cached = await getCachedVideo(url);

    if (cached?.blob) {
        console.log("[Video] Loaded from device storage:",speciesId);
        return URL.createObjectURL(cached.blob);
    }

    console.log("[Video] Not cached, using online source:",url);
    return url;
}

//Checks if a cahced video exists for a species w/ a given id (for use in video availability icons)
async function getCachedVideoBySpeciesId(speciesId) {
    const database = await window.db.init();

    return new Promise((resolve,reject) => {
        const tx = database.transaction(["video_blobs"],"readonly");
        const store = tx.objectStore("video_blobs");
        const index = store.index("species_id");

        const request = index.get(String(speciesId));

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

window.saveVideoBlob = saveVideoBlob;
window.getCachedVideo = getCachedVideo;
window.cacheVideo = cacheVideo;
window.loadVideoWithCache = loadVideoWithCache;
window.getCachedVideoBySpeciesId = getCachedVideoBySpeciesId;