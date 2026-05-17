/************************************************************************
//Functions for caching and loading videos
//Split this to another file so it can be used outside of video page (video availability icons)
//
*************************************************************************/

//Save video as blob obejct
async function saveVideoBlob(url,speciesId,blob) {
    const database = await window.db.init();

    return new Promise((resolve,reject) => {
        const tx = database.transaction(['video_blobs'],'readwrite');
        const store = tx.objectStore('video_blobs');

        const request = store.put({
            url: url,
            species_id: speciesId,
            blob: blob,
            cachedAt: new Date().toISOString()
        });
        console.log("[SAVE URL]", url);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}

//Load the video from the db
async function getCachedVideo(url) {
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

//Cache the video
async function cacheVideo(url,speciesId) {
    try {
        const response = await fetch(url);
        if (!response.ok) {throw new Error(`Vidoe fetch failed: ${response.status}`);}

        const blob = await response.blob();
        if (!blob || blob.size === 0) {throw new Error("Video blob is empty");}

        await saveVideoBlob(url,speciesId,blob);

        console.log("[Video] Cached:",url);
        return blob;
    }
    catch (err) {console.log("[Video] Failed:",url,err);}
}


//Load the video from cache (load from cache if available, otherwise need to sync)
async function loadVideoWithCache(url,speciesId) {
    const cached = await getCachedVideo(url);

    if (cached?.blob) {
        console.log("[Video] Loaded from IndexedDB:",speciesId);
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