// imageCache.js - Updated to load from IndexedDB
import { dbGetAll } from "./db.js";

/**
 * Load species images from IndexedDB media table
 * Falls back to images.json if IndexedDB is empty
 */
async function loadSpeciesImages(scientificName) {
    console.log(`[imageCache] Loading images for: ${scientificName}`);
    
    try {
        // Try loading from IndexedDB first
        const loaded = await loadFromIndexedDB(scientificName);
        if (loaded) return;

        // Fallback to images.json (backward compatibility)
        await loadFromImagesJson(scientificName);
    } catch (err) {
        console.error("[imageCache] Error loading images:", err);
    }
}

/**
 * Load images from IndexedDB (new method)
 */
async function loadFromIndexedDB(scientificName) {
    try {
        // Get all media from IndexedDB
        const allMedia = await dbGetAll("media");
        
        if (!allMedia || allMedia.length === 0) {
            console.log("[imageCache] IndexedDB is empty, falling back to images.json");
            return false;
        }

        // Find media for this species (match by species_name or scientific_name)
        const speciesMedia = allMedia.filter(m => {
            const mediaSpeciesName = (m.species_name || "").toLowerCase().trim();
            const targetName = scientificName.toLowerCase().trim();
            
            // Match by scientific_name or species_name
            return mediaSpeciesName === targetName || 
                   mediaSpeciesName.replace(/\s+/g, "-") === targetName.replace(/\s+/g, "-");
        });

        console.log(`[imageCache] Found ${speciesMedia.length} media items in IndexedDB`);

        if (speciesMedia.length === 0) {
            console.warn("[imageCache] No media found in IndexedDB for this species");
            return false;
        }

        // Filter only images (not videos)
        const images = speciesMedia.filter(m => m.media_type === "image");

        if (images.length === 0) {
            console.warn("[imageCache] No images found (only videos)");
            return false;
        }

        // Render images
        const gallery = document.getElementById("image-gallery");
        if (!gallery) {
            console.error("[imageCache] Gallery element not found");
            return false;
        }

        gallery.innerHTML = "";

        images.forEach((media, index) => {
            const img = document.createElement("img");
            
            // Use download_link (Service Worker will cache it)
            img.src = media.download_link;
            img.alt = media.alt_text || `Image ${index + 1}`;
            img.loading = "lazy";
            img.title = media.alt_text || "";
            
            // Handle loading errors
            img.onerror = () => {
                console.error(`[imageCache] Failed to load: ${media.download_link}`);
                img.style.display = "none";
            };

            gallery.appendChild(img);
        });

        console.log(`[imageCache] Successfully loaded ${images.length} images from IndexedDB`);
        return true;

    } catch (err) {
        console.error("[imageCache] IndexedDB error:", err);
        return false;
    }
}

/**
 * Load images from images.json (fallback for backward compatibility)
 */
async function loadFromImagesJson(scientificName) {
    try {
        console.log("[imageCache] Loading from images.json (fallback)");
        
        const res = await fetch("/data/images.json");
        if (!res.ok) {
            throw new Error("images.json not found");
        }

        const imagesMap = await res.json();
        const id = scientificName.toLowerCase().replace(/\s+/g, '-');
        const imageUrls = imagesMap[id] || [];

        const gallery = document.getElementById("image-gallery");
        if (!gallery) return;

        gallery.innerHTML = "";

        if (imageUrls.length === 0) {
            console.warn("[imageCache] No images found in images.json");
            return;
        }

        imageUrls.forEach(url => {
            const img = document.createElement("img");
            img.src = url;
            img.loading = "lazy";
            gallery.appendChild(img);
        });

        console.log(`[imageCache] Loaded ${imageUrls.length} images from images.json`);
    } catch (err) {
        console.warn("[imageCache] images.json not available:", err);
    }
}

// ========================================
// AUTO-LOAD ON PAGE LOAD
// ========================================
document.addEventListener("DOMContentLoaded", () => {
    const stored = localStorage.getItem("selected_species");
    if (!stored) {
        console.log("[imageCache] No selected species in localStorage");
        return;
    }

    try {
        const species = JSON.parse(stored);
        
        if (!species.scientific_name) {
            console.error("[imageCache] Invalid species data");
            return;
        }

        loadSpeciesImages(species.scientific_name);
    } catch (err) {
        console.error("[imageCache] Error parsing species data:", err);
    }
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadSpeciesImages };
}