async function preloadAllImages() {
    try {
        const res = await fetch("/data/images.json");
        const imagesMap = await res.json();

        const allImages = Object.values(imagesMap).flat();

        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: "CACHE_IMAGES",
                images: allImages
            });
            console.log(`Preloading ${allImages.length} images`);
        } else {
            console.warn("Service Worker not controlling yet");
        }
    } catch (e) {
        console.warn("Failed to preload images", e);
    }
}