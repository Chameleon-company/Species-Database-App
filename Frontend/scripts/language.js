// language.js

const languages = [
  { name: "English", flag: "🇦🇺", code: "en" },
  { name: "Tetum", flag: "🇹🇱", code: "tet" }
];

const langList = document.getElementById("langList");
const selectedFlag = document.getElementById("selectedFlag");
const selectedName = document.getElementById("selectedName");
const continueBtn = document.getElementById("continueBtn");

let currentLanguage = languages[0]; // default English

languages.forEach(lang => {
  const div = document.createElement("div");
  div.className = "lang-item";
  div.setAttribute("role", "option");
  div.innerHTML = `
    <span class="flag">${lang.flag}</span>
    <span class="name">${lang.name}</span>
  `;
  div.addEventListener("click", () => selectLanguage(lang));
  langList.appendChild(div);
});

function selectLanguage(lang) {
  currentLanguage = lang;
  selectedFlag.textContent = lang.flag;
  selectedName.textContent = lang.name.toUpperCase();
}

continueBtn.addEventListener("click", () => {
  if (!currentLanguage) return alert("Please select a language first!");
  
  // Save the language in localStorage
  localStorage.setItem("userLanguage", currentLanguage.code);

  // Go to login page
  window.location.href = "login.html";
});
