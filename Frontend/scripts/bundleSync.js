// scripts/bundleSync.js - Sync data from backend to IndexedDB

/**
 * Bundle Sync Module
 * 
 * Handles synchronization of species data and media from the backend API
 * to the local IndexedDB for offline access.
 * 
 * Dependencies: db.js (window.db), config.js (window.API_CONFIG)
 */

// Fetch JSON from URL
async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  return res.json();
}

// Main sync function
async function syncBundle(options = {}) {
  const { onProgress, force = false } = options;
  const progress = typeof onProgress === "function" ? onProgress : () => {};

  // Ensure db is initialized
  if (!window.db) {
    throw new Error("Database not initialized. Make sure db.js is loaded.");
  }

  // Ensure API_CONFIG is available
  if (!window.API_CONFIG) {
    throw new Error("API_CONFIG not found. Make sure config.js is loaded.");
  }

  const bundleUrl = `${window.API_CONFIG.baseUrl}${window.API_CONFIG.endpoints.bundle}`;

  try {
    // Initialize database
    await window.db.init();

    // Check local version
    const metadata = await window.db.getSyncMetadata();
    const localVersion = metadata.version || 0;
    progress({ phase: "version", message: `Local version: ${localVersion}` });

    // Fetch from backend
    console.log("[Sync] Fetching from:", bundleUrl);
    progress({ phase: "fetch", message: "Downloading data..." });
    
    const bundle = await fetchJson(bundleUrl);

    const remoteVersion = bundle.version ?? bundle.bundle_version ?? 1;
    progress({ phase: "version", message: `Remote version: ${remoteVersion}` });

    // Skip if same version (unless forced)
    if (!force && localVersion !== 0 && Number(localVersion) === Number(remoteVersion)) {
      progress({ phase: "done", message: "Already up to date" });
      console.log("[Sync] Already up to date");
      return { updated: false, version: localVersion };
    }

    // Update sync status to 'syncing'
    await window.db.updateSyncMetadata({
      version: localVersion,
      status: 'syncing',
      last_sync: null,
      error: null
    });

    // Get species data from bundle
    const speciesEn = bundle.species_en ?? [];
    const speciesTet = bundle.species_tet ?? [];
    const media = bundle.media ?? [];

    // Store English species
    if (speciesEn.length > 0) {
      console.log("[Sync] Storing species_en:", speciesEn.length);
      progress({ phase: "species", message: `Storing ${speciesEn.length} English species...` });
      
      // Add language field to each species
      const speciesEnWithLang = speciesEn.map(s => ({ ...s, language: 'en' }));
      await window.db.storeSpecies(speciesEnWithLang);
    }

    // Store Tetum species
    if (speciesTet.length > 0) {
      console.log("[Sync] Storing species_tet:", speciesTet.length);
      progress({ phase: "species", message: `Storing ${speciesTet.length} Tetum species...` });
      
      // Add language field to each species
      const speciesTetWithLang = speciesTet.map(s => ({ ...s, language: 'tet' }));
      await window.db.storeSpecies(speciesTetWithLang);
    }

    // Cache media URLs in Service Worker
    if (navigator.serviceWorker?.controller && media.length > 0) {
      const urls = media
        .map(m => m.download_link || m.media_url || m.url)
        .filter(Boolean);

      if (urls.length > 0) {
        navigator.serviceWorker.controller.postMessage({
          type: "CACHE_MEDIA",
          urls: urls,
        });
        console.log("[Sync] Sent", urls.length, "URLs to Service Worker for caching");
      }
    }

    // Store media metadata
    if (media.length > 0) {
      console.log("[Sync] Storing media metadata:", media.length);
      
      const mediaItems = media.map((m, index) => ({
        media_id: m.media_id || m.id || index + 1,
        species_id: m.species_id,
        species_name: m.species_name || m.scientific_name || "",
        media_type: m.media_type || "image",
        download_link: m.download_link || m.media_url || m.url || "",
        alt_text: m.alt_text || "",
      }));

      await window.db.storeMediaMetadata(mediaItems);

      // Report progress for media
      progress({
        phase: "media",
        current: media.length,
        total: media.length,
        message: `Stored ${media.length} media items`,
      });
    }

    // Update sync metadata with new version
    const syncTime = new Date().toISOString();
    await window.db.updateSyncMetadata({
      version: Number(remoteVersion),
      status: 'idle',
      last_sync: syncTime,
      timestamp: syncTime,
      error: null
    });

    progress({ phase: "done", message: "Sync complete!" });
    console.log("[Sync] Complete! Version:", remoteVersion);

    return { updated: true, version: remoteVersion };

  } catch (error) {
    console.error("[Sync] Error:", error);
    
    // Update sync status with error
    await window.db.updateSyncMetadata({
      status: 'error',
      error: error.message
    });

    progress({ phase: "error", message: error.message });
    throw error;
  }
}

// Check for updates without downloading
async function checkForUpdates() {
  if (!window.db || !window.API_CONFIG) {
    return { hasUpdates: false, error: "Dependencies not loaded" };
  }

  try {
    const changesUrl = `${window.API_CONFIG.baseUrl}${window.API_CONFIG.endpoints.changes}`;
    const metadata = await window.db.getSyncMetadata();
    const localVersion = metadata.version || 0;

    const response = await fetchJson(`${changesUrl}?version=${localVersion}`);
    
    return {
      hasUpdates: response.has_changes || response.hasChanges || false,
      localVersion: localVersion,
      remoteVersion: response.version || response.latest_version
    };
  } catch (error) {
    console.error("[Sync] Check for updates failed:", error);
    return { hasUpdates: false, error: error.message };
  }
}

// Make functions available globally
if (typeof window !== 'undefined') {
  window.syncBundle = syncBundle;
  window.checkForUpdates = checkForUpdates;
}

console.log("[bundleSync.js] Module loaded");