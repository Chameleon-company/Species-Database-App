    const languages = [
      { code: "en-AU", name: "ENGLISH AU", flag: "🇦🇺" },
      { code: "tet",   name: "Tetum",      flag: "🇹🇱" },
      //testchange
    ];

    let selected = languages[0];

    const listEl = document.getElementById("langList");
    const searchEl = document.getElementById("searchInput");
    const selectedNameEl = document.getElementById("selectedName");
    const selectedFlagEl = document.getElementById("selectedFlag");

    function renderList(filterText = "") {
      const q = filterText.trim().toLowerCase();
      const filtered = q
        ? languages.filter(l => l.name.toLowerCase().includes(q))
        : languages;

      listEl.innerHTML = "";

      filtered.forEach(lang => {
        const row = document.createElement("div");
        row.className = "row" + (lang.code === selected.code ? " selected" : "");
        row.setAttribute("role", "option");
        row.setAttribute("aria-selected", lang.code === selected.code ? "true" : "false");

        row.innerHTML = `
          <div class="flag" aria-hidden="true">${lang.flag}</div>
          <div class="name">${lang.name}</div>
          <div class="radio" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M9.2 16.6 4.9 12.3l1.4-1.4 2.9 2.9 8-8 1.4 1.4-9.4 9.4z"/></svg>
          </div>
        `;

        row.addEventListener("click", () => {
          selected = lang;
          selectedNameEl.textContent = lang.name;
          selectedFlagEl.textContent = lang.flag;
          renderList(searchEl.value);
        });

        listEl.appendChild(row);
      });
    }

    searchEl.addEventListener("input", (e) => renderList(e.target.value));

    document.getElementById("continueBtn").addEventListener("click", () => {
      console.log("Selected language:", selected);
      window.location.href = "login.html"; // move to home page?
    });

    renderList();