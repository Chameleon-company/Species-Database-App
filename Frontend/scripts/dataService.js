// Ensure db.js is loaded
if (!window.db) {
  console.error("dataService.js: db.js not loaded!");
}

const dataService = {
  // Get all species for a language
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

          // Filter by language
          if (language) {
            list = list.filter((item) => {
              if (item.language) return item.language === language;

              if (typeof item.id === "string") {
                return item.id.endsWith(`_${language}`);
              }

              return false;
            });
          }

          resolve(list);
        };

        req.onerror = () => {
          console.error("getAllSpecies: error", req.error);
          resolve([]);
        };
      } catch (err) {
        console.error("getAllSpecies: unexpected error", err);
        resolve([]);
      }
    });
  },

  // Get single species by ID
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

        // Language checks
        if (row.language && row.language !== language) return resolve(null);

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

  // Simple text search
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

  // Attribute-based filtering
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

  // Get all images/videos for a species
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
