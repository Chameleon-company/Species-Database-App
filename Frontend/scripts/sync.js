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

//send image URLs to the sw for background cachjing
//after bundle sync and incremental updates
function sendIMGToSW(images = [])
{
  if(!navigator.serviceWorker?.controller) return

  const urls = images
    .map((m)=> m.download_link || m.url)
    .filter(Boolean)
  
  if(!urls.length) return
  navigator.serviceWorker.controller.postMessage({
    type: "CACHE_MEDIA",
    urls
  })
}

class SyncManager {
  constructor() {
    // Get API config (assumes config.js is loaded)
    this.apiConfig = typeof API_CONFIG !== 'undefined' ? API_CONFIG : {
    baseUrl:
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1"
        ? "http://127.0.0.1:5000"
        : "https://species-database-app.onrender.com",

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
    this.timeout = 30000; // 30 seconds default timeout

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
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    return headers;
  }

  /**
   * Fetch with timeout and error handling
   * @param {string} url - URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>}
   */
  async fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers
        }
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - server took too long to respond');
      }
      throw error;
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

    // Check if online
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

      // Force bundle sync if requested or no local data
      if (options.forceBundle || !hasData) {
        this.reportProgress('Starting initial sync...');
        return await this.performInitialSync();
      } else {
        // Check for updates and do incremental sync
        return await this.performIncrementalSync();
      }
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
      
      let response;
      try {
        response = await this.fetchWithTimeout(bundleUrl, {
          method: 'GET'
        });
      } catch (error) {
        if (error.message.includes('timeout')) {
          throw new Error('Network timeout - please check your connection');
        }
        throw new Error(`Network error: ${error.message}`);
      }

      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed - please login again');
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const bundle = await response.json();

      // Validate bundle structure
      if (!bundle || typeof bundle.version === 'undefined') {
        throw new Error('Invalid bundle response: missing version');
      }

      // Step 2: Store species data atomically
      this.reportProgress('Storing species data...');
      await this.storeSpeciesBundle(bundle);

      // Step 3: Store media metadata (if present)
      if (bundle.media && Array.isArray(bundle.media) && bundle.media.length > 0) {
        this.reportProgress(`Storing media metadata (${bundle.media.length} items)...`);
        await this.db.storeMediaMetadata(bundle.media);

        //trigerring background media caching
        sendIMGToSW(bundle.media)
      }

      // Step 4: Update sync metadata
      await this.db.updateSyncMetadata({
        version: bundle.version,
        last_sync: new Date().toISOString(),
        status: 'idle',
        error: null
      });

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
      
      let checkResponse;
      try {
        checkResponse = await this.fetchWithTimeout(changesUrl, {
          method: 'GET'
        });
      } catch (error) {
        if (error.message.includes('timeout')) {
          throw new Error('Network timeout - please check your connection');
        }
        throw new Error(`Network error: ${error.message}`);
      }

      // Handle authentication errors
      if (checkResponse.status === 401 || checkResponse.status === 403) {
        throw new Error('Authentication failed - please login again');
      }

      if (!checkResponse.ok) {
        const errorText = await checkResponse.text().catch(() => checkResponse.statusText);
        throw new Error(`HTTP error checking changes! status: ${checkResponse.status} - ${errorText}`);
      }

      const checkResult = await checkResponse.json();

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
      
      let response;
      try {
        response = await this.fetchWithTimeout(incrementalUrl, {
          method: 'GET'
        });
      } catch (error) {
        if (error.message.includes('timeout')) {
          throw new Error('Network timeout - please check your connection');
        }
        throw new Error(`Network error: ${error.message}`);
      }

      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed - please login again');
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const changes = await response.json();

      // Validate response
      if (typeof changes.latest_version === 'undefined') {
        throw new Error('Invalid incremental response: missing latest_version');
      }

      // Step 3: Replace changed species (full row replacement using put())
      this.reportProgress('Updating changed species...');
      await this.replaceChangedSpecies(changes);

      if(changes.media && Array.isArray(changes.media))
      {
        sendIMGToSW(changes.media)
      }

      // Step 4: Update sync metadata
      await this.db.updateSyncMetadata({
        version: changes.latest_version,
        last_sync: new Date().toISOString(),
        status: 'idle',
        error: null
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
        }
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
   * Store species bundle data atomically
   * @param {Object} bundle - Bundle data
   * @private
   */
  async storeSpeciesBundle(bundle) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Clear existing species data
      await this.db.clearSpecies();

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

      // Store all species in a single transaction (unified store)
      if (allSpecies.length > 0) {
        await this.db.storeSpecies(allSpecies);
      }

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
        this.reportProgress(`Retry in ${delay/1000}s...`);
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

