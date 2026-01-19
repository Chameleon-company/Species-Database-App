/**
 * dataService.js
 *
 * Read-only access layer for IndexedDB.
 * UI (specieslist.js, details pages, search) will use
 * ONLY these methods to fetch species data.
 *
 * This file NEVER calls backend. It ONLY reads
 * from the local IndexedDB created in db.js.
 */

// We expect db.js to attach a global "db" object
if (!window.db) {
  console.error("dataService.js: db.js not loaded!");
}

const dataService = {
  /**
   * Get ALL species (filtered by language: 'en' or 'tet')
   */
  async getAllSpecies(language = "en") {
    await window.db.init();

    return new Promise(async (resolve) => {
      try {
        const database = await window.db._openDB();
        const tx = database.transaction("species", "readonly");
        const store = tx.objectStore("species");

        const req = store.getAll();

        req.onsuccess = () => {
          let list = req.result || [];

          // If a language is requested, filter
          if (language) {
            list = list.filter((item) => {
              // 1) Prefer explicit language field if present
              if (item.language) {
                return item.language === language;
              }

              // 2) Fallback: infer from id suffix "1_en", "3_tet", etc.
              if (typeof item.id === "string") {
                return item.id.endsWith(`_${language}`);
              }

              return false;
            });
          }

          resolve(list);
        };

        req.onerror = () => {
          console.error("getAllSpecies: error reading store", req.error);
          resolve([]);
        };
      } catch (err) {
        console.error("getAllSpecies: unexpected error", err);
        resolve([]);
      }
    });
  },

  /**
   * Get a single species by ID.
   * ID can be "1_en", "1_tet" etc.
   */
  async getSpeciesById(id, language = "en") {
    if (!id) return null;

    await window.db.init();
    const database = await window.db._openDB();

    return new Promise((resolve) => {
      const tx = database.transaction("species", "readonly");
      const store = tx.objectStore("species");

      const req = store.get(id);

      req.onsuccess = () => {
        const row = req.result;
        if (!row) return resolve(null);

        // Prefer explicit language match if field exists
        if (row.language && row.language !== language) {
          return resolve(null);
        }

        // Otherwise, also accept id-suffix match as backup
        if (
          typeof row.id === "string" &&
          !row.id.endsWith(`_${language}`)
        ) {
          return resolve(null);
        }

        resolve(row);
      };

      req.onerror = () => {
        console.error("getSpeciesById: error", req.error);
        resolve(null);
      };
    });
  },

  /**
   * Search across scientific_name, common_name, and habitat
   */
  async searchSpecies(query, language = "en") {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const all = await this.getAllSpecies(language);

    return all.filter((s) => {
      const sci = (s.scientific_name || "").toLowerCase();
      const common = (s.common_name || "").toLowerCase();
      const habitat = (s.habitat || "").toLowerCase();

      return sci.includes(q) || common.includes(q) || habitat.includes(q);
    });
  },

  /**
   * Filter by habitat, leaf_type, fruit_type
   */
  async filterSpecies(filters = {}, language = "en") {
    const all = await this.getAllSpecies(language);

    return all.filter((s) => {
      let ok = true;

      if (filters.habitat && s.habitat !== filters.habitat) ok = false;
      if (filters.leaf_type && s.leaf_type !== filters.leaf_type) ok = false;
      if (filters.fruit_type && s.fruit_type !== filters.fruit_type) ok = false;

      return ok;
    });
  },

  /**
   * Get all media for a species (images/videos)
   */
  async getSpeciesMedia(speciesId) {
    if (!speciesId) return [];

    await window.db.init();
    const database = await window.db._openDB();

    return new Promise((resolve) => {
      const tx = database.transaction("media", "readonly");
      const store = tx.objectStore("media");

      const index = store.index("species_id");
      const req = index.getAll(speciesId);

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  },
};

// Expose globally
window.dataService = dataService;
