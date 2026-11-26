/**
 * Data Synchronization Module
 * 
 * Handles synchronization between local IndexedDB and backend API.
 * Supports both initial bundle sync and incremental sync.
 * 
 * Dependencies:
 * - scripts/config.js (must be loaded first)
 * - scripts/db.js (must be loaded first)
 */

/**
 * Delete URLs from every service worker media cache (names starting with "media-cache").
 * Runs in the page, so it works without a service worker controller. Never throws.
 * @param {string[]} urls
 * @returns {Promise<void>}
 */
async function uncacheMedia(urls) {
  if (!urls.length || !('caches' in self)) return;
  try {
    for (const name of await caches.keys()) {
      if (!name.startsWith('media-cache')) continue;
      const cache = await caches.open(name);
      await Promise.all(urls.map((url) => cache.delete(url)));
    }
  } catch (error) {
    console.warn('[Sync] Could not clear cached media', error);
  }
}

/**
 * Delete every media-cache entry whose URL is not in keepUrls (media dropped from the bundle).
 * Never throws.
 * @param {Set<string>} keepUrls
 * @returns {Promise<void>}
 */
async function pruneCachedMedia(keepUrls) {
  if (!('caches' in self)) return;
  try {
    for (const name of await caches.keys()) {
      if (!name.startsWith('media-cache')) continue;
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        if (!keepUrls.has(request.url)) await cache.delete(request);
      }
    }
  } catch (error) {
    console.warn('[Sync] Could not prune cached media', error);
  }
}

// Image downloads in flight, shared by the background prefetch and loadImageWithCache (imageCache.js)
// so the same image is never fetched twice at once.
const imageBlobJobs = new Map();

/**
 * Put one image into IndexedDB image_blobs, the store the pages read offline. Takes it from the
 * service worker media cache left by older versions when it is there (and drops that copy),
 * otherwise downloads it. Never throws.
 * @param {string} url
 * @param {number|string} speciesId
 * @param {number} timeoutMs - Covers the whole download, body included
 * @returns {Promise<{blob: Blob, stored: boolean}|null>} The image (stored=false when IndexedDB refused it), or null when it could not be fetched
 */
function cacheImageBlob(url, speciesId, timeoutMs = 30000) {
  if (!url) return Promise.resolve(null);
  if (imageBlobJobs.has(url)) return imageBlobJobs.get(url);

  const job = (async () => {
    let blob = null;
    let fromCacheStorage = false;
    try {
      const cached = 'caches' in self ? await caches.match(url) : null;
      if (cached && cached.ok) {
        blob = await cached.blob();
        fromCacheStorage = blob.size > 0;
      }
    } catch (error) {
      blob = null;
    }

    if (!fromCacheStorage) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        blob = await response.blob();
      } catch (error) {
        console.warn('[Sync] Image download failed:', url, error.message || error);
        return null;
      } finally {
        clearTimeout(timer);
      }
    }

    if (!blob || blob.size === 0) return null;

    try {
      await db.saveImageBlob(url, speciesId, blob);
    } catch (error) {
      console.warn('[Sync] Could not store image:', url, error);
      return { blob, stored: false }; // still usable on screen now
    }
    if (fromCacheStorage) await uncacheMedia([url]);
    return { blob, stored: true };
  })().finally(() => imageBlobJobs.delete(url));

  imageBlobJobs.set(url, job);
  return job;
}

if (typeof window !== 'undefined') {
  window.cacheImageBlob = cacheImageBlob;
}

class SyncManager {
  constructor() {
    // Get API config (assumes config.js is loaded)
    this.apiConfig = typeof API_CONFIG !== 'undefined' ? API_CONFIG : {
      baseUrl:
        location.hostname === "localhost" ||
          location.hostname === "127.0.0.1"
          ? "http://127.0.0.1:5000"
          : "https://species-database-api.onrender.com",

      endpoints: {
        bundle: '/api/bundle',
        changes: '/api/species/changes',
        incremental: '/api/species/incremental'
      }
    };

    // Get DB instance (assumes db.js is loaded)
    this.db = typeof db !== 'undefined' ? db : null;
    if (!this.db) {
      console.error('sync.js: db instance not found. Make sure scripts/db.js is loaded first.');
    }

    // Sync state
    this.isSyncing = false;
    this.syncProgress = null;

    // Event callbacks
    this.onProgress = null;
    this.onComplete = null;
    this.onError = null;

    // Retry configuration
    this.maxRetries = 3;
    this.retryDelay = 1000; // milliseconds
    this.timeout = 30000; // 30 seconds default timeout (covers the response body too)
    this.bundleTimeout = 90000; // the full bundle is ~170 KB, allow slow mobile links

    // Background image prefetch running in this page (single flight)
    this.imagePrefetch = null;

    // Authentication token storage
    this.authToken = null;
  }

  /**
   * Set authentication token for API calls
   * @param {string} token - Auth token (Bearer token)
   */
  setAuthToken(token) {
    this.authToken = token;
  }

  /**
   * Get authentication headers for API calls
   * @returns {Object} Headers object
   */
  getAuthHeaders() {
    // No Content-Type: every sync call is a GET without a body, and a Content-Type of
    // application/json would force a CORS preflight before each request.
    const headers = {};

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * GET a JSON document. The timeout covers the headers AND the body, so a stalled
   * download cannot leave a sync running forever.
   * @param {string} url - URL to fetch
   * @param {number} timeoutMs - Deadline for the whole request
   * @returns {Promise<Object>} Parsed JSON
   */
  async fetchJson(url, timeoutMs = this.timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: this.getAuthHeaders()
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed - please login again');
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Network timeout - please check your connection');
      }
      if (error instanceof TypeError) {
        throw new Error(`Network error: ${error.message}`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Check if sync is currently in progress
   * @returns {boolean}
   */
  isSyncingInProgress() {
    return this.isSyncing;
  }

  /**
   * Get current sync status from IndexedDB
   * @returns {Promise<Object>}
   */
  async getSyncStatus() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const metadata = await this.db.getSyncMetadata();
      return {
        status: metadata?.status || 'idle',
        version: metadata?.version || 0,
        lastSync: metadata?.last_sync || null,
        error: metadata?.error || null
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        status: 'error',
        version: 0,
        lastSync: null,
        error: error.message
      };
    }
  }

  /**
   * Check if IndexedDB has any species data
   * @returns {Promise<boolean>}
   */
  async hasLocalData() {
    if (!this.db) {
      return false;
    }

    try {
      const count = await this.db.getSpeciesCount();
      return count > 0;
    } catch (error) {
      console.error('Error checking local data:', error);
      return false;
    }
  }

  /**
   * Main sync entry point - decides whether to do initial or incremental sync
   * @param {Object} options - Sync options
   * @param {boolean} options.forceBundle - Force full bundle sync
   * @returns {Promise<Object>}
   */
  async checkAndSync(options = {}) {
    // Prevent concurrent syncs
    if (this.isSyncing) {
      console.warn('Sync already in progress, skipping...');
      return { synced: false, reason: 'already_syncing' };
    }

    // Check if offline
    if (!navigator.onLine) {
      console.log('Device is offline, skipping sync');
      return { synced: false, reason: 'offline' };
    }

    try {
      this.isSyncing = true;

      // Initialize database if needed
      if (this.db && typeof this.db.init === 'function') {
        await this.db.init();
      }

      // Check if we have local data
      const hasData = await this.hasLocalData();

      let syncResult;
      // Force bundle sync if requested or no local data
      if (options.forceBundle || !hasData) {
        this.reportProgress('Starting initial sync...');
        syncResult = await this.performInitialSync();
      } else {
        // Check for updates and do incremental sync
        syncResult = await this.performIncrementalSync();
      }

      // Images download in the background; the species list never waits for them.
      this.startImagePrefetch();
      return syncResult;

      /*
      // Species already up to date — check if a previous sync left media pending
      if (!syncResult.synced && syncResult.reason === 'up_to_date') {
        const metadata = await this.db.getSyncMetadata();
        if (metadata?.pending_media?.length > 0) {
          const retryResult = await this.retryFailedMedia();
          return { ...syncResult, mediaRetry: retryResult };
        }
      }

      return syncResult;
      */
    } catch (error) {
      console.error('Sync error:', error);
      await this.updateSyncStatus('error', error.message);
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    } finally {
      this.isSyncing = false;
      this.syncProgress = null;
    }
  }

  /**
   * Perform initial bundle sync - downloads all data
   * @returns {Promise<Object>}
   */
  async performInitialSync() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Update sync status
      await this.updateSyncStatus('syncing');

      // Step 1: Fetch bundle from API
      this.reportProgress('Fetching bundle from server...');
      const bundleUrl = `${this.apiConfig.baseUrl}${this.apiConfig.endpoints.bundle}`;

      const bundle = await this.fetchJson(bundleUrl, this.bundleTimeout);

      // Validate bundle structure
      if (!bundle || typeof bundle.version === 'undefined') {
        throw new Error('Invalid bundle response: missing version');
      }

      // Step 2: Store species, media metadata and the new version in one transaction
      this.reportProgress('Storing species data...');
      await this.storeSpeciesBundle(bundle);

      // Step 3: Drop stored images/videos that are no longer in the bundle
      if (Array.isArray(bundle.media) && bundle.media.length > 0) {
        await this.pruneRemovedMedia(bundle.media);
      }

      this.reportProgress('Sync complete!');

      const result = {
        success: true,
        synced: true,
        type: 'bundle',
        version: bundle.version,
        speciesCount: {
          en: bundle.species_en?.length || 0,
          tet: bundle.species_tet?.length || 0
        },
        mediaCount: bundle.media?.length || 0
      };

      if (this.onComplete) {
        this.onComplete(result);
      }

      return result;

    } catch (error) {
      console.error('Initial sync failed:', error);
      await this.updateSyncStatus('error', error.message);
      throw error;
    }
  }

  /**
   * Perform incremental sync - downloads only changed species
   * @returns {Promise<Object>}
   */
  async performIncrementalSync() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Get current local version
      const metadata = await this.db.getSyncMetadata();
      const localVersion = metadata?.version || 0;

      // Step 1: Check if updates are available
      this.reportProgress('Checking for updates...');
      const changesUrl = `${this.apiConfig.baseUrl}${this.apiConfig.endpoints.changes}?since_version=${localVersion}`;

      const checkResult = await this.fetchJson(changesUrl);

      // Already up to date
      if (checkResult.up_to_date) {
        this.reportProgress('Data is up to date');
        return {
          success: true,
          synced: false,
          reason: 'up_to_date',
          version: localVersion
        };
      }

      // Too many changes - use full bundle
      if (checkResult.force_bundle) {
        this.reportProgress('Too many changes, downloading full bundle...');
        return await this.performInitialSync();
      }

      // Step 2: Perform incremental sync
      await this.updateSyncStatus('syncing');
      this.reportProgress(`Syncing ${checkResult.change_count} changes...`);

      const incrementalUrl = `${this.apiConfig.baseUrl}${this.apiConfig.endpoints.incremental}?since_version=${localVersion}`;

      const changes = await this.fetchJson(incrementalUrl);

      if (changes.force_bundle) {
        this.reportProgress('Server asked for a full download...');
        return await this.performInitialSync();
      }

      // Validate response
      if (typeof changes.latest_version === 'undefined') {
        throw new Error('Invalid incremental response: missing latest_version');
      }

      // Step 3: Replace changed species (full row replacement using put())
      this.reportProgress('Updating changed species...');
      await this.replaceChangedSpecies(changes);

      if (changes.media && Array.isArray(changes.media) && changes.media.length > 0) {
        //Storing the new image of new species that are added by incremental sync
        // (the image files themselves are fetched by the background prefetch)
        await this.db.upsertMediaMetadata(changes.media);
      }

      // Step 4: Update sync metadata
      await this.db.updateSyncMetadata({
        version: changes.latest_version,
        last_sync: new Date().toISOString(),
        status: 'idle',
        error: null,
        media_status: 'pending',
        pending_media: []
      });

      this.reportProgress('Sync complete!');

      const result = {
        success: true,
        synced: true,
        type: 'incremental',
        version: changes.latest_version,
        previousVersion: localVersion,
        speciesCount: {
          en: changes.species_en?.length || 0,
          tet: changes.species_tet?.length || 0
        },
        deletedCount: changes.deleted_species_ids?.length || 0
      };

      if (this.onComplete) {
        this.onComplete(result);
      }

      return result;

    } catch (error) {
      console.error('Incremental sync failed:', error);
      await this.updateSyncStatus('error', error.message);
      throw error;
    }
  }

  /**
   * Start the background image prefetch without waiting for it. Never throws.
   */
  startImagePrefetch() {
    if (typeof window === 'undefined') return;
    // Give the species list a moment to render (and fetch its thumbnails) first.
    setTimeout(() => {
      this.prefetchImages().catch((error) => console.warn('[Sync] Image prefetch failed:', error));
    }, 1500);
  }

  /**
   * Download every image in the media metadata that is not stored yet into IndexedDB
   * image_blobs (the store the pages read offline), a few at a time. Videos are not
   * downloaded here: they stay opt-in through the Download button on video.html.
   * Safe to call often: stored images are skipped and only one run happens per page.
   * Records in sync_metadata only the URLs that really failed.
   * @returns {Promise<Object>}
   */
  prefetchImages() {
    if (!this.imagePrefetch) {
      this.imagePrefetch = this.runImagePrefetch().finally(() => {
        this.imagePrefetch = null;
      });
    }
    return this.imagePrefetch;
  }

  async runImagePrefetch() {
    const media = await this.db.getAllMedia();
    const stored = new Set(await this.db.getImageBlobUrls());
    // Older versions also kept these images in the service worker media cache: keep one copy.
    await uncacheMedia([...stored]);
    const todo = [];
    const seen = new Set();
    for (const item of media) {
      const url = item.download_link || item.url;
      if (item.media_type !== 'image' || !url || stored.has(url) || seen.has(url)) continue;
      seen.add(url);
      todo.push(item);
    }

    if (!todo.length) {
      await this.db.patchSyncMetadata({ media_status: 'complete', pending_media: [] });
      return { total: seen.size + stored.size, downloaded: 0, failed: [] };
    }

    console.log(`[Sync] Downloading ${todo.length} images for offline use in the background...`);
    const failed = [];
    let downloaded = 0;
    let next = 0;
    let failuresInARow = 0;

    const worker = async () => {
      // Stop early when the network is clearly gone; the next sync resumes from here.
      while (next < todo.length && failuresInARow < 6) {
        const item = todo[next++];
        const url = item.download_link || item.url;
        const result = await cacheImageBlob(url, item.species_id);
        if (result && result.stored) {
          downloaded++;
          failuresInARow = 0;
        } else {
          failed.push(url);
          failuresInARow++;
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);

    const notTried = todo.length - downloaded - failed.length;
    await this.db.patchSyncMetadata({
      media_status: failed.length || notTried ? 'partial' : 'complete',
      pending_media: failed
    });
    console.log(`[Sync] Images stored: ${downloaded}, failed: ${failed.length}, left for later: ${notTried}`);
    return { total: todo.length, downloaded, failed, notTried };
  }

  /**
   * Kept for callers of the old API: retries missing images in the background.
   * @returns {Promise<Object>}
   */
  retryFailedMedia() {
    return this.prefetchImages();
  }

  /**
   * After a full bundle replaced the media list, delete stored image/video blobs and
   * service worker cache entries whose URL is no longer in it. Never throws.
   * @param {Array} mediaList - The bundle's complete media list
   */
  async pruneRemovedMedia(mediaList) {
    const keep = new Set();
    for (const item of mediaList) {
      for (const url of [item.download_link, item.streaming_link, item.url]) {
        if (!url) continue;
        keep.add(url);
        try {
          keep.add(new URL(url).href);
        } catch (error) {
          // not a valid URL; the raw string is enough
        }
      }
    }
    try {
      const removed = await this.db.pruneMediaBlobs(keep);
      if (removed.length) console.log(`[Sync] Removed ${removed.length} stored media files no longer in the bundle`);
    } catch (error) {
      console.warn('[Sync] Could not prune stored media', error);
    }
    await pruneCachedMedia(keep);
  }

  /**
   * Store species bundle data atomically
   * @param {Object} bundle - Bundle data
   * @private
   */
  async storeSpeciesBundle(bundle) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Prepare all species with language field
      const allSpecies = [];

      // Add English species with language field
      if (bundle.species_en && Array.isArray(bundle.species_en) && bundle.species_en.length > 0) {
        for (const species of bundle.species_en) {
          // Ensure id field exists (use species_id as fallback)
          if (!species.id && species.species_id) {
            species.id = species.species_id;
          }
          // Ensure language field is set
          species.language = 'en';
          allSpecies.push(species);
        }
      }

      // Add Tetum species with language field
      if (bundle.species_tet && Array.isArray(bundle.species_tet) && bundle.species_tet.length > 0) {
        for (const species of bundle.species_tet) {
          // Ensure id field exists (use species_id as fallback)
          if (!species.id && species.species_id) {
            species.id = species.species_id;
          }
          // Ensure language field is set
          species.language = 'tet';
          allSpecies.push(species);
        }
      }

      // Never wipe the offline guide with an empty bundle
      if (allSpecies.length === 0) {
        throw new Error('Invalid bundle response: no species');
      }

      // Species, media metadata and the new version go in ONE transaction: if anything
      // fails (or the page closes) the previous data stays as it was.
      const media = Array.isArray(bundle.media) && bundle.media.length > 0 ? bundle.media : null;
      await this.db.replaceBundle(allSpecies, media, {
        version: bundle.version,
        status: 'idle',
        last_sync: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        error: null,
        media_status: 'pending',
        pending_media: []
      });

      // Validate data integrity - check stored count
      const storedCount = await this.db.getSpeciesCount();
      if (storedCount === 0 && allSpecies.length > 0) {
        throw new Error('Data validation failed - no species stored');
      }

    } catch (error) {
      console.error('Error storing species bundle:', error);

      // Handle quota exceeded errors
      if (error.message.includes('quota') || error.message.includes('QuotaExceeded')) {
        throw new Error('Storage quota exceeded - please free up space on your device');
      }

      throw new Error(`Failed to store species data: ${error.message}`);
    }
  }

  /**
   * Replace changed species using full row replacement (put())
   * Uses IndexedDB put() to replace entire rows, NOT operation-based updates
   * @param {Object} changes - Incremental changes data
   * @private
   */
  async replaceChangedSpecies(changes) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Validate version numbers (ensure version increases)
      const metadata = await this.db.getSyncMetadata();
      const currentVersion = metadata?.version || 0;
      const newVersion = changes.latest_version || 0;

      if (newVersion <= currentVersion) {
        console.warn(`Version not increasing: current=${currentVersion}, new=${newVersion}`);
      }

      // Replace English species (full row replacement)
      if (changes.species_en && Array.isArray(changes.species_en)) {
        for (const species of changes.species_en) {
          // Ensure id field exists
          if (!species.id && species.species_id) {
            species.id = species.species_id;
          }
          // Ensure language field is set
          species.language = 'en';
          // Use put() to replace entire row (not operation replay)
          await this.db.putSpecies(species);
        }
      }

      // Replace Tetum species (full row replacement)
      if (changes.species_tet && Array.isArray(changes.species_tet)) {
        for (const species of changes.species_tet) {
          // Ensure id field exists
          if (!species.id && species.species_id) {
            species.id = species.species_id;
          }
          // Ensure language field is set
          species.language = 'tet';
          // Use put() to replace entire row (not operation replay)
          await this.db.putSpecies(species);
        }
      }

      const enIds = new Set((changes.species_en || []).map((s) => Number(s.species_id)));
      const tetIds = new Set((changes.species_tet || []).map((s) => Number(s.species_id)));
      for (const id of new Set([...enIds, ...tetIds])) {
        if (!enIds.has(id)) await this.db.deleteSpeciesLanguage(id, 'en');
        if (!tetIds.has(id)) await this.db.deleteSpeciesLanguage(id, 'tet');
      }

      for (const speciesId of changes.deleted_species_ids || []) {
        const urls = await this.db.deleteSpecies(speciesId);
        await uncacheMedia(urls);
      }

      // Validate row replacement worked
      const finalVersion = await this.db.getSyncMetadata();
      if (finalVersion.version !== newVersion && newVersion > 0) {
        console.warn('Version mismatch after replacement - will be fixed on metadata update');
      }

    } catch (error) {
      console.error('Error replacing changed species:', error);

      // Handle quota exceeded errors
      if (error.message.includes('quota') || error.message.includes('QuotaExceeded')) {
        throw new Error('Storage quota exceeded - please free up space on your device');
      }

      throw new Error(`Failed to update species data: ${error.message}`);
    }
  }

  /**
   * Update sync status in IndexedDB
   * @param {string} status - Status: 'idle', 'syncing', 'error'
   * @param {string} error - Error message (if status is 'error')
   * @private
   */
  async updateSyncStatus(status, error = null) {
    if (!this.db) {
      return;
    }

    try {
      const metadata = await this.db.getSyncMetadata();
      await this.db.updateSyncMetadata({
        ...metadata,
        status: status,
        error: error,
        last_sync: status === 'idle' ? new Date().toISOString() : metadata?.last_sync
      });
    } catch (err) {
      console.error('Error updating sync status:', err);
    }
  }

  /**
   * Retry sync with exponential backoff
   * @param {Object} options - Retry options
   * @returns {Promise<Object>}
   */
  async retrySync(options = {}) {
    const maxRetries = options.maxRetries || this.maxRetries;
    let attempt = 0;
    let delay = this.retryDelay;

    while (attempt < maxRetries) {
      try {
        this.reportProgress(`Retrying sync (attempt ${attempt + 1}/${maxRetries})...`);
        return await this.checkAndSync({ forceBundle: options.forceBundle });
      } catch (error) {
        attempt++;

        // Don't retry on authentication errors
        if (error.message.includes('Authentication failed')) {
          throw error;
        }

        // Don't retry on quota exceeded errors
        if (error.message.includes('quota') || error.message.includes('QuotaExceeded')) {
          throw error;
        }

        if (attempt >= maxRetries) {
          throw error;
        }

        // Exponential backoff
        delay *= 2;
        this.reportProgress(`Retry in ${delay / 1000}s...`);
        await this.sleep(delay);
      }
    }
  }

  /**
   * Manual sync trigger (for error recovery/fallback)
   * @param {boolean} forceBundle - Force full bundle sync
   * @returns {Promise<Object>}
   */
  async manualSync(forceBundle = false) {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }

    try {
      return await this.checkAndSync({ forceBundle });
    } catch (error) {
      // Retry with exponential backoff on failure
      return await this.retrySync({ forceBundle });
    }
  }

  /**
   * Sleep utility for retry delays
   * @param {number} ms - Milliseconds to sleep
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Report sync progress
   * @param {string} message - Progress message
   * @private
   */
  reportProgress(message) {
    this.syncProgress = message;
    console.log(`[Sync] ${message}`);
    if (this.onProgress) {
      this.onProgress(message);
    }
  }

  /**
   * Set progress callback
   * @param {Function} callback - Callback function
   */
  setOnProgress(callback) {
    this.onProgress = callback;
  }

  /**
   * Set completion callback
   * @param {Function} callback - Callback function
   */
  setOnComplete(callback) {
    this.onComplete = callback;
  }

  /**
   * Set error callback
   * @param {Function} callback - Callback function
   */
  setOnError(callback) {
    this.onError = callback;
  }
}

// Create global instance
const syncManager = new SyncManager();

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.syncManager = syncManager;
}

// For Node.js environments (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SyncManager, syncManager };
}

