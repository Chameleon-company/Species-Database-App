async function loadSpeciesImages(scientificName) {
    console.log(scientificName);
    try{
        const res = await fetch("/data/images.json");
        const imagesMap = await res.json();

        const id = scientificName.toLowerCase().replace(/\s+/g,'-');
        const imageUrls = imagesMap[id] || [];

        const gallery = document.getElementById("image-gallery");
        gallery.innerHTML = "";

        if(imageUrls.length !== 0){
            imageUrls.forEach(url => {
                
                const img = document.createElement("img");
                img.loading = "lazy";
                loadImageWithCache(img,url,id); //Load from cache if possible
                gallery.appendChild(img);
            });
        }
        console.log(gallery);
    } catch (e) {
        console.warn("images.json not available");
    }
}

//Save image as blob obejct
async function saveImageBlob(url,speciesId,blob) {
    const database = await window.db.init();

    return new Promise((resolve,reject) => {
        const tx = database.transaction(['image_blobs'],'readwrite');
        const store = tx.objectStore('image_blobs');

        const request = store.put({
            url: url,
            species_id: speciesId,
            blob: blob,
            cachedAt: new Date().toISOString()
        });

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
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

//Cache the image
async function cacheImage(url,speciesId) {
    try {
        const response = await fetch(url);
        if (!response.ok) {throw new Error(`Image fetch failed: ${response.status}`);}

        const blob = await response.blob();
        if (!blob || blob.size === 0) {throw new Error("Image blob is empty");}

        await saveImageBlob(url,speciesId,blob);

        console.log("[ImageCache] Cached:",url);
    }
    catch (err) {
        console.log("[ImageCache] Failed:",url,err);
    }
}

const activeImageLoads = new Set();
//Load the image from cache (load from cache if available, otherwise need to sync)
async function loadImageWithCache(imgElement,url,speciesId) {
    const placeholder = "Assets/icons/placeholderImageOffline.png"; 

    if (!url || /\.(mp4|mov|webm|avi)$/i.test(url)) {imgElement.src = placeholder;return;}

    imgElement.src = placeholder; //set as placeholder to begin with
    const cached = await getCachedImage(url);

    if (cached && cached.blob) {
        console.log("[ImageCache] Loaded from IndexedDB:", url);
        imgElement.src = URL.createObjectURL(cached.blob);
        return;
    }
    //Prevents caching multiple times (dont need next test if blob has already been found!)
    if (activeImageLoads.has(url)) {return;}
    activeImageLoads.add(url);

    try {
        console.log("[ImageCache] No cache, trying online:", url);

        const response = await fetch(url);

        if (!response.ok) {throw new Error(`Image fetch failed: ${response.status}`);}

        const blob = await response.blob();
        await saveImageBlob(url, speciesId, blob);
        imgElement.src = URL.createObjectURL(blob);
        console.log("[ImageCache] Cached and displayed:", url);
    } 
    catch (err) {
        console.warn("[ImageCache] No cache and online fetch failed:", url, err);

        imgElement.src = placeholder; //If there is no cached image just use placehodler image
        imgElement.alt = "Offline: image unavailable";
    }
    finally {activeImageLoads.delete(url);}
}



document.addEventListener("DOMContentLoaded", () => {
    const stored = localStorage.getItem("selected_species");
    if(!stored) return;

    const species = JSON.parse(stored);

    loadSpeciesImages(species.scientific_name);
});

window.saveImageBlob = saveImageBlob;
window.getCachedImage = getCachedImage;
window.cacheImage = cacheImage;
window.loadImageWithCache = loadImageWithCache;