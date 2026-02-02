/**
 * IndexedDB Database Module
 *
 * Manages local IndexedDB storage for species data, media metadata, and sync status.
 * Provides methods for storing, retrieving, and managing species data.
 *
 * Database: 'species_db'
 * Stores:
 *   - 'species' (keyPath: 'id')
 *        Unified store for all species.
 *        Primary key 'id' is a COMPOSITE value: `${species_id}_${language}`
 *        Example: "1_en", "1_tet"
 *        Each language version becomes a separate row, but they share numeric species_id.
 *   - 'media' (keyPath: 'media_id') - Media metadata with species_id index
 *   - 'sync_metadata' (keyPath: 'key') - Sync tracking metadata
 *
 * Indexes on 'species' store:
 *   - common_name
 *   - habitat
 *   - leaf_type
 *   - fruit_type
 *   - language
 *
 * Dependencies: None (standalone module)
 */

class SpeciesDB {
  constructor() {
    this.dbName = 'species_db';
    this.dbVersion = 2; // Increment if schema (stores/indexes) changes
    this.db = null;
  }

  /**
   * Initialize/open IndexedDB database
   * Creates schema with required stores and indexes
   * @returns {Promise<IDBDatabase>}
   */
  async init() {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(new Error(`Failed to open database: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;

        // Handle database close event
        this.db.onclose = () => {
          this.db = null;
        };

        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const transaction = event.target.transaction;

        // Create 'species' object store with keyPath: 'id'
        if (!db.objectStoreNames.contains('species')) {
          const speciesStore = db.createObjectStore('species', { keyPath: 'id' });

          // Create indexes on species store
          speciesStore.createIndex('common_name', 'common_name', { unique: false });
          speciesStore.createIndex('habitat', 'habitat', { unique: false });
          speciesStore.createIndex('leaf_type', 'leaf_type', { unique: false });
          speciesStore.createIndex('fruit_type', 'fruit_type', { unique: false });
          speciesStore.createIndex('language', 'language', { unique: false }); // For bilingual support
        } else {
          // Migration: Add language index if upgrading from v1
          const speciesStore = transaction.objectStore('species');
          if (!speciesStore.indexNames.contains('language')) {
            speciesStore.createIndex('language', 'language', { unique: false });
          }
          if (!speciesStore.indexNames.contains('common_name')) {
            speciesStore.createIndex('common_name', 'common_name', { unique: false });
          }
          if (!speciesStore.indexNames.contains('habitat')) {
            speciesStore.createIndex('habitat', 'habitat', { unique: false });
          }
          if (!speciesStore.indexNames.contains('leaf_type')) {
            speciesStore.createIndex('leaf_type', 'leaf_type', { unique: false });
          }
          if (!speciesStore.indexNames.contains('fruit_type')) {
            speciesStore.createIndex('fruit_type', 'fruit_type', { unique: false });
          }
        }

        // Create 'media' object store with keyPath: 'media_id'
        if (!db.objectStoreNames.contains('media')) {
          const mediaStore = db.createObjectStore('media', { keyPath: 'media_id' });
          // Create index on species_id for efficient querying
          mediaStore.createIndex('species_id', 'species_id', { unique: false });
        }

        // Create 'sync_metadata' object store with keyPath: 'key'
        if (!db.objectStoreNames.contains('sync_metadata')) {
          db.createObjectStore('sync_metadata', { keyPath: 'key' });
        }

        console.log('IndexedDB schema initialized: species_db v' + this.dbVersion);
      };

      request.onblocked = () => {
        console.warn('IndexedDB upgrade blocked - please close other tabs with this app');
      };
    });
  }

  /**
   * Internal method to get database instance (for dataService.js)
   * @returns {Promise<IDBDatabase>}
   */
  async _openDB() {
    return await this.init();
  }

  /**
   * Get sync metadata from IndexedDB
   * @returns {Promise<Object>}
   */
  async getSyncMetadata() {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sync_metadata'], 'readonly');
      const store = transaction.objectStore('sync_metadata');
      const request = store.get('sync_status');

      request.onsuccess = () => {
        const metadata = request.result?.value || {
          version: 0,
          status: 'idle',
          last_sync: null,
          timestamp: null,
          error: null
        };
        resolve(metadata);
      };

      request.onerror = () => {
        console.error('Error getting sync metadata:', request.error);
        // Return default metadata on error
        resolve({
          version: 0,
          status: 'idle',
          last_sync: null,
          timestamp: null,
          error: null
        });
      };
    });
  }

  /**
   * Update sync metadata in IndexedDB
   * @param {Object} data - Metadata object with version, last_sync, status, error
   * @returns {Promise<void>}
   */
  async updateSyncMetadata(data) {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sync_metadata'], 'readwrite');
      const store = transaction.objectStore('sync_metadata');

      const timestamp = data.last_sync || new Date().toISOString();

      const metadataEntry = {
        key: 'sync_status',
        value: {
          version: data.version !== undefined ? data.version : 0,
          status: data.status || 'idle',
          last_sync: data.last_sync || null,
          timestamp: data.timestamp !== undefined ? data.timestamp : timestamp,
          error: data.error !== undefined ? data.error : null
        }
      };

      const request = store.put(metadataEntry);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Error updating sync metadata:', request.error);
        reject(new Error(`Failed to update sync metadata: ${request.error}`));
      };
    });
  }

  /**
   * Get total count of species in IndexedDB
   * @param {string} language - Optional language filter ('en' or 'tet')
   * @returns {Promise<number>}
   */
  async getSpeciesCount(language = null) {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['species'], 'readonly');
      const store = transaction.objectStore('species');

      let request;
      if (language) {
        const index = store.index('language');
        request = index.count(IDBKeyRange.only(language));
      } else {
        request = store.count();
      }

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Error counting species:', request.error);
        reject(new Error(`Failed to count species: ${request.error}`));
      };
    });
  }

  /**
   * Check if IndexedDB has any species data
   * @returns {Promise<boolean>}
   */
  async hasData() {
    try {
      const count = await this.getSpeciesCount();
      return count > 0;
    } catch (error) {
      console.error('Error checking for data:', error);
      return false;
    }
  }

  /**
   * Clear all species from the store
   * @param {string} language - Optional language filter ('en' or 'tet'), if null clears all
   * @returns {Promise<void>}
   */
  async clearSpecies(language = null) {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['species'], 'readwrite');
      const store = transaction.objectStore('species');

      if (language) {
        // Clear only specific language
        const index = store.index('language');
        const request = index.openCursor(IDBKeyRange.only(language));

        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };

        request.onerror = () => {
          console.error('Error clearing species:', request.error);
          reject(new Error(`Failed to clear species: ${request.error}`));
        };
      } else {
        // Clear all species
        const clearRequest = store.clear();

        clearRequest.onsuccess = () => {
          resolve();
        };

        clearRequest.onerror = () => {
          console.error('Error clearing species:', clearRequest.error);
          reject(new Error(`Failed to clear species: ${clearRequest.error}`));
        };
      }
    });
  }

  /**
   * Store array of species in IndexedDB (atomic transaction)
   * Species will use composite primary key:
   *   id = `${species_id}_${language}`
   * so that 'en' and 'tet' versions can coexist.
   * @param {Array} speciesArray - Array of species objects
   * @returns {Promise<void>}
   */
  async storeSpecies(speciesArray) {
    if (!Array.isArray(speciesArray)) {
      throw new Error('speciesArray must be an array');
    }

    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['species'], 'readwrite');
      const store = transaction.objectStore('species');

      let completed = 0;
      let hasError = false;
      let errorMessage = null;

      if (speciesArray.length === 0) {
        resolve();
        return;
      }

      // Store all species in a single transaction
      for (const species of speciesArray) {
        // Get the shared numeric ID from backend
        const baseId = species.species_id || species.id;

        if (!baseId) {
          console.warn('Species missing species_id/id field:', species);
          species.id = `temp_${completed}`;
        } else {
          // Ensure language field exists (default to 'en' if not specified)
          const lang = species.language || 'en';
          species.language = lang;

          // Composite primary key so en + tet can both exist
          // Example: "1_en", "1_tet"
          species.id = `${baseId}_${lang}`;
          species.species_id = baseId;
        }

        // Use put() to handle both inserts and updates
        const request = store.put(species);

        request.onsuccess = () => {
          completed++;
          if (completed === speciesArray.length && !hasError) {
            resolve();
          }
        };

        request.onerror = () => {
          console.error(`Error storing species ${species.id}:`, request.error);
          hasError = true;
          errorMessage = `Failed to store species ${species.id}: ${request.error}`;
          completed++;

          // If transaction aborted, reject immediately
          if (request.error && request.error.name === 'AbortError') {
            reject(new Error(errorMessage));
          } else if (completed === speciesArray.length) {
            reject(new Error(errorMessage));
          }
        };
      }
    });
  }

  /**
   * Replace single species using IndexedDB put() (full row replacement)
   * Uses composite key `${species_id}_${language}` so that different
   * language versions remain separate rows.
   * @param {Object} species - Single species object (full row)
   * @returns {Promise<void>}
   */
  async putSpecies(species) {
    if (!species || typeof species !== 'object') {
      throw new Error('species must be an object');
    }

    // Get shared ID from species_id or id
    const baseId = species.species_id || species.id;
    if (!baseId) {
      throw new Error('species must have an id or species_id field');
    }

    // Ensure language field exists (default to 'en')
    const lang = species.language || 'en';
    species.language = lang;

    // Composite primary key
    species.id = `${baseId}_${lang}`;
    species.species_id = baseId;

    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['species'], 'readwrite');
      const store = transaction.objectStore('species');

      // Use put() for full row replacement
      const request = store.put(species);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error(`Error putting species ${species.id}:`, request.error);
        reject(new Error(`Failed to update species: ${request.error}`));
      };
    });
  }

  /**
   * Store media metadata array in IndexedDB
   * @param {Array} mediaArray - Array of media metadata objects (must have 'media_id')
   * @returns {Promise<void>}
   */
  async storeMediaMetadata(mediaArray) {
    if (!Array.isArray(mediaArray)) {
      throw new Error('mediaArray must be an array');
    }

    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['media'], 'readwrite');
      const store = transaction.objectStore('media');

      // Clear existing media first
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {
        let completed = 0;
        let hasError = false;

        if (mediaArray.length === 0) {
          resolve();
          return;
        }

        for (const media of mediaArray) {
          // Validate media has required 'media_id' field
          if (!media.media_id) {
            console.warn('Media missing media_id field:', media);
            completed++;
            continue;
          }

          const request = store.add(media);

          request.onsuccess = () => {
            completed++;
            if (completed === mediaArray.length) {
              if (hasError) {
                reject(new Error('Failed to store some media'));
              } else {
                resolve();
              }
            }
          };

          request.onerror = () => {
            // Try put() if add() fails (duplicate key)
            if (request.error.name === 'ConstraintError') {
              const putRequest = store.put(media);
              putRequest.onsuccess = () => {
                completed++;
                if (completed === mediaArray.length && !hasError) {
                  resolve();
                }
              };
              putRequest.onerror = () => {
                console.error(`Error storing media ${media.media_id}:`, putRequest.error);
                hasError = true;
                completed++;
                if (completed === mediaArray.length) {
                  reject(new Error(`Failed to store media: ${putRequest.error}`));
                }
              };
            } else {
              console.error(`Error storing media ${media.media_id}:`, request.error);
              hasError = true;
              completed++;
              if (completed === mediaArray.length) {
                reject(new Error(`Failed to store media: ${request.error}`));
              }
            }
          };
        }
      };

      clearRequest.onerror = () => {
        console.error('Error clearing media store:', clearRequest.error);
        reject(new Error(`Failed to clear media store: ${clearRequest.error}`));
      };
    });
  }

  /**
   * Handle IndexedDB quota exceeded errors gracefully
   * @param {Error} error - The error object
   * @returns {Promise<void>}
   */
  async handleQuotaExceeded(error) {
    if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      console.error('Storage quota exceeded. Please free up space.');
      throw new Error('Storage quota exceeded. Please free up space on your device.');
    }
    throw error;
  }

  /**
   * Get species by ID and language
   * @param {number|string} speciesId - The species ID
   * @param {string} language - Language code ('en' or 'tet')
   * @returns {Promise<Object|null>}
   */
  async getSpeciesById(speciesId, language = 'en') {
    const db = await this.init();
    const compositeKey = `${speciesId}_${language}`;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['species'], 'readonly');
      const store = transaction.objectStore('species');
      const request = store.get(compositeKey);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('Error getting species:', request.error);
        reject(new Error(`Failed to get species: ${request.error}`));
      };
    });
  }

  /**
   * Get all species for a specific language
   * @param {string} language - Language code ('en' or 'tet')
   * @returns {Promise<Array>}
   */
  async getAllSpecies(language = 'en') {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['species'], 'readonly');
      const store = transaction.objectStore('species');
      const index = store.index('language');
      const request = index.getAll(IDBKeyRange.only(language));

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error('Error getting all species:', request.error);
        reject(new Error(`Failed to get species: ${request.error}`));
      };
    });
  }

  /**
   * Get media metadata by species ID
   * @param {number|string} speciesId - The species ID
   * @returns {Promise<Array>}
   */
  async getMediaBySpeciesId(speciesId) {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['media'], 'readonly');
      const store = transaction.objectStore('media');
      const index = store.index('species_id');
      const request = index.getAll(IDBKeyRange.only(Number(speciesId)));

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error('Error getting media:', request.error);
        reject(new Error(`Failed to get media: ${request.error}`));
      };
    });
  }
}

// Create global instance
const db = new SpeciesDB();

// Make db available globally
if (typeof window !== 'undefined') {
  window.db = db;
}

// Export for Node.js environments (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SpeciesDB, db };
}