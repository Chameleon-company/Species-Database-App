let loadedSpeciesData = [];

// Render species cards

function renderSpecies(data) {
  const speciesList = document.getElementById("species-list");

  if (!speciesList) {
    console.error("Species list element (#species-list) not found");
    return;
  }

  speciesList.innerHTML = "";

  if (!Array.isArray(data) || data.length === 0) {
    renderNoResults();
    return;
  }

  data.forEach((species) => {
    const id = species.id ?? "";
    const scientific = species.scientific_name ?? "";
    const common = species.common_name ?? "";

    const imgSrc =
      species.image_url ||
      species.image ||
      (species.images && species.images[0]) ||
      "Assets/icons/image-placeholder.svg";

    speciesList.innerHTML += `
      <div id="${id}" class="species-item" onclick="goToDetail('${id}')">
        <img src="${imgSrc}" alt="${scientific}" class="species-card-img" onerror="this.src='Assets/icons/image-placeholder.svg'">
        <div class="species-text">
          <h3 class="species-name">${scientific}</h3>
          <p class="common-name-species">${common}</p>
        </div>
      </div>
    `;
  });
}


// No results UI

function renderNoResults() {
  const speciesList = document.getElementById("species-list");
  if (!speciesList) return;

  speciesList.innerHTML = `
    <div style="text-align:center; padding:2rem; color:#475569;">
      <p style="font-size:1.1rem; font-weight:600;">No results found</p>
      <p style="font-size:0.9rem;">Try checking your spelling or searching again.</p>
    </div>
  `;
}

// Public API for home.html

window.setSpeciesData = function setSpeciesData(data) {
  loadedSpeciesData = Array.isArray(data) ? data : [];
  renderSpecies(loadedSpeciesData);
};

window.getLoadedSpeciesData = function () {
  return loadedSpeciesData;
};


// Navigation to detail page

function goToDetail(id) {
  window.location.href = `specie.html?id=${encodeURIComponent(id)}`;
}

window.goToDetail = goToDetail;
window.renderSpecies = renderSpecies;
window.renderNoResults = renderNoResults;


// Search input (works with your applyFilters in home.html)

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    if (typeof window.applyFilters === "function") {
      window.applyFilters();
      return;
    }

    const query = (searchInput.value || "").toLowerCase().trim();
    if (!query) {
      renderSpecies(loadedSpeciesData);
      return;
    }

    const filtered = loadedSpeciesData.filter((s) => {
      const sci = (s.scientific_name || "").toLowerCase();
      const common = (s.common_name || "").toLowerCase();
      const habitat = (s.habitat || "").toLowerCase();
      return sci.includes(query) || common.includes(query) || habitat.includes(query);
    });

    renderSpecies(filtered);
  });
});
