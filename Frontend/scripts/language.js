// language.js

const languages = [
  { name: "English", flag: "🇦🇺", code: "en" },
  { name: "Tetum", flag: "🇹🇱", code: "tet" }
];

const langList = document.getElementById("langList");
const searchEl = document.getElementById("searchInput")
const selectedFlag = document.getElementById("selectedFlag");
const selectedName = document.getElementById("selectedName");
const continueBtn = document.getElementById("continueBtn");

let currentLanguage = languages[0]; // default English
function renderList(filterText="") {
  const q = filterText.trim().toLowerCase()
  const filtered = q
    ? languages.filter(l => l.name.toLowerCase().includes(q))
    : languages
  langList.innerHTML  = ""

  filtered.forEach(lang => {
    const row = document.createElement("div");
    row.className = "row" + (lang.code === currentLanguage.code  ? " selected" : "")
    row.setAttribute("role", "option")
    row.setAttribute(
      "aria-selected",
      lang.code === currentLanguage.code ? "true" : "false"
    )
    row.innerHTML = `
      <div class="flag" aria-hidden="true">${lang.flag}</div>
      <div class="name">${lang.name}</div>
      <div class="radio" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M9.2 16.6 4.9 12.3l1.4-1.4 2.9 2.9 8-8 1.4 1.4-9.4 9.4z"/>
        </svg>
      </div>
    `;
    row.addEventListener("click", () => 
    {
      currentLanguage = lang
      selectedName.textContent = lang.name
      selectedFlag.textContent = lang.flag
      renderList(searchEl.value)
    })
    
    langList.appendChild(row)
  })
}

searchEl?.addEventListener("input", e => renderList(e.target.value))

continueBtn.addEventListener("click", () => {
  if (!currentLanguage) return
  
  // Save the language in localStorage
  localStorage.setItem("appLanguage", currentLanguage.code);

  //route based on language
  //page-based... in future look at translating the single page
  //still need language from backend to allow admins to change the language
  if(currentLanguage.code === "tet")
  {
    window.location.href = "login_tetum.html"
  }
  else {
    window.location.href = "login.html"
  }
})

selectedFlag.textContent = currentLanguage.flag
selectedName.textContent = currentLanguage.name

renderList()
