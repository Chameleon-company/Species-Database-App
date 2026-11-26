window.loadedSpeciesData = [];

// Species text comes from the API (admin-entered), so escape it before it goes into HTML
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Each render or "no results" draw takes a new number; an older render that finishes
// later (its IndexedDB lookups are async) sees the number changed and draws nothing.
let renderSeq = 0;

// Render species cards

async function renderSpecies(data) {
  const speciesList = document.getElementById("species-list");

  if (!speciesList) {
    console.error("Species list element (#species-list) not found");
    return;
  }

  const token = ++renderSeq;

  speciesList.innerHTML = "";

  if (!Array.isArray(data) || data.length === 0) {
    renderNoResults();
    return;
  }

  let html = ""
  for(const species of data){
    const id = species.species_id ?? ""
    const scientific = species.scientific_name ?? "";
    const common = species.common_name ?? "";

    const thumb = await dataService.getThumbnail(species.species_id);

    //Get video state icon if video exists online or is cached
    const hasVideo = await dataService.hasVideo(species.species_id);
    let videoIcon = "";

    if (hasVideo) {

      try {
        const cachedVideo = await getCachedVideoBySpeciesId(species.species_id);
        const isCached = !!cachedVideo?.blob;

        videoIcon = isCached
        ? `<img src="Assets/icons/videoCachedIcon.png" class="species-card-video-available" alt="video cached">`
        : `<img src="Assets/icons/videoCloudIcon.png" class="species-card-video-available" alt="video online">`;

      } catch (err) {console.warn("[SpeciesList] Video cache check failed:", err);}
      
    }
    

    html += `
      <div class="species-item" data-detail-id="${escapeHtml(id)}">
      ${
        thumb
        ? `<img data-thumb="${escapeHtml(thumb)}" data-species-id="${escapeHtml(id)}" alt="${escapeHtml(scientific)}" class="species-card-img cached-thumb">`
        : ``
      }
      <div class="species-content">
        <div class="species-text">
          <h3 class="species-name">${escapeHtml(scientific)}</h3>
          <p class="common-name-species">${escapeHtml(common)}</p>
        </div>

          ${videoIcon}
        </div>
      </div>
    `;
  }

  // A newer search/filter started while this one was reading IndexedDB: its result wins
  if (token !== renderSeq) return;

  speciesList.innerHTML = html;
  document.querySelectorAll(".cached-thumb").forEach((img) => {
    const url = img.dataset.thumb;
    const speciesId = img.dataset.speciesId;

    loadImageWithCache(img, url, speciesId);
  });
}


// No results UI

function renderNoResults() {
  const speciesList = document.getElementById("species-list");
  if (!speciesList) return;

  renderSeq++; // a render still in progress must not replace this message

  const isTetum = window.location.pathname.includes("tetum.html");

  const title = isTetum
    ? "La hetan rezultadu"
    : "No results found";

  const message = isTetum
    ? "Favor verifika ortografia ka buka fali."
    : "Try checking your spelling or searching again.";

  speciesList.innerHTML = `
    <div style="text-align:center; padding:2rem; color:#475569;">
      <p style="font-size:1.1rem; font-weight:600;">${title}</p>
      <p style="font-size:0.9rem;">${message}</p>
    </div>
  `;
}

// Public API for home.html

window.setSpeciesData = function setSpeciesData(data) {
  window.loadedSpeciesData = Array.isArray(data) ? data : [];

  if(typeof window.applyFilters === "function" && typeof window.renderSpecies === "function") {
    window.applyFilters();
  }
  else if(typeof window.renderSpecies === "function") {
    renderSpecies(window.loadedSpeciesData);
  }

};

window.getLoadedSpeciesData = function () {
  return window.loadedSpeciesData;
};


// Navigation to detail page

function goToDetail(id) {
  const isTet = window.location.pathname.includes("tetum.html")

  const targetP = isTet
    ? "specie_tetum.html" :
    "specie.html"
  window.location.href = `${targetP}?id=${encodeURIComponent(id)}`;
}

window.goToDetail = goToDetail;
window.renderSpecies = renderSpecies;
window.renderNoResults = renderNoResults;
window.escapeHtml = escapeHtml;


// Leaf/fruit type filters. The stored values differ in case, spacing and apostrophes
// ("Pinnately compound (Double)" / "(double)"), so options are built from the data that is
// actually loaded and compared on a normalised key.

function normalizeFilterValue(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Distinct values of `field` ("leaf_type" or "fruit_type") in the loaded species, as
// [{label, value}] where value is the normalised key and label the first spelling seen.
function getFilterOptions(field) {
  const byKey = new Map();
  for (const species of window.loadedSpeciesData || []) {
    const key = normalizeFilterValue(species[field]);
    if (key && !byKey.has(key)) {
      byKey.set(key, String(species[field]).replace(/\s+/g, " ").trim());
    }
  }
  return [...byKey.entries()]
    .map(([value, label]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

window.normalizeFilterValue = normalizeFilterValue;
window.getFilterOptions = getFilterOptions;


// Search input (works with your applyFilters in home.html)

document.addEventListener("DOMContentLoaded", () => {
  // Open a species from its card (one listener for the whole list, no inline onclick)
  document.getElementById("species-list")?.addEventListener("click", (e) => {
    const item = e.target.closest(".species-item[data-detail-id]");
    if (item) goToDetail(item.dataset.detailId);
  });

  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    if (typeof window.applyFilters === "function") {
      window.applyFilters();
      return;
    }

    const query = (searchInput.value || "").toLowerCase().trim();
    if (!query) {
      renderSpecies(window.loadedSpeciesData);
      return;
    }

    const filtered = window.loadedSpeciesData.filter((s) => {
      const sci = (s.scientific_name || "").toLowerCase();
      const common = (s.common_name || "").toLowerCase();
      const habitat = (s.habitat || "").toLowerCase();
      return sci.includes(query) || common.includes(query) || habitat.includes(query);
    });

    renderSpecies(filtered);
  });
});
