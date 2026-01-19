// scripts/bundleSync.js - Sync data from backend to IndexedDB
import { dbPut, dbGetAll, metaGet, metaSet } from "./db.js";
import { API_CONFIG } from "./config.js";

// Fetch JSON from URL
async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  return res.json();
}

// Download media as blob
async function downloadBlob(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return await res.blob();
}

// Store multiple items
async function putMany(storeName, items) {
  for (const item of items) {
    await dbPut(storeName, item);
  }
}

// Main sync function
export async function syncBundle(options = {}) {
  const { onProgress, force = false } = options;
  const progress = typeof onProgress === "function" ? onProgress : () => {};

  const bundleUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.bundle}`;
  
  // Check local version
  const localVersion = await metaGet("bundle_version");
  progress({ phase: "version", message: `Local: ${localVersion ?? "none"}` });

  // Fetch from backend
  console.log("[Sync] Fetching from:", bundleUrl);
  const bundle = await fetchJson(bundleUrl);
  
  const remoteVersion = bundle.version ?? bundle.bundle_version ?? 1;
  progress({ phase: "version", message: `Remote: ${remoteVersion}` });

  // Skip if same version (unless forced)
  if (!force && localVersion !== null && Number(localVersion) === Number(remoteVersion)) {
    progress({ phase: "done", message: "Already up to date" });
    return { updated: false };
  }

  // Store species data
  const speciesEn = bundle.species_en ?? [];
  const speciesTet = bundle.species_tet ?? [];
  const media = bundle.media ?? [];

  console.log("[Sync] Storing species_en:", speciesEn.length);
  await putMany("species_en", speciesEn);

  console.log("[Sync] Storing species_tet:", speciesTet.length);
  await putMany("species_tet", speciesTet);

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
      console.log("[Sync] Sent", urls.length, "URLs to Service Worker");
    }
  }

  // Store media metadata
  let completed = 0;
  for (const m of media) {
    const mediaItem = {
      media_id: m.media_id || m.id || completed + 1,
      species_id: m.species_id,
      species_name: m.species_name || m.scientific_name || "",
      media_type: m.media_type || "image",
      download_link: m.download_link || m.media_url || m.url || "",
      alt_text: m.alt_text || "",
    };
    
    await dbPut("media", mediaItem);
    completed++;
    
    progress({
      phase: "media",
      current: completed,
      total: media.length,
      message: `Cached ${completed}/${media.length}`,
    });
  }

  // Save version
  await metaSet("bundle_version", Number(remoteVersion));
  
  progress({ phase: "done", message: "Sync complete!" });
  console.log("[Sync] Complete! Version:", remoteVersion);
  
  return { updated: true, version: remoteVersion };
}

console.log("[bundleSync.js] Module loaded");