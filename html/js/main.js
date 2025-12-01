function openTab(tabName) {
  document.querySelectorAll(".tabcontent").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".tablink").forEach(btn => btn.classList.remove("active-tab"));
  const target = document.getElementById(tabName);
  if (target) target.classList.add("active");
  const activeBtn = document.querySelector(`.tablink[data-tab="${tabName}"]`);
  if (activeBtn) activeBtn.classList.add("active-tab");
}

function populateDatalist(id, values) {
  const dl = document.getElementById(id);
  if (!dl) return;
  dl.innerHTML = "";
  [...new Set(values)].sort().forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    dl.appendChild(opt);
  });
}
window.populateDatalist = populateDatalist;

document.addEventListener("DOMContentLoaded", () => {
  openTab("resultsTab");
  document.querySelectorAll(".tablink").forEach(btn => {
    btn.addEventListener("click", () => openTab(btn.getAttribute("data-tab")));
  });

  document.getElementById("toggleFilters")?.addEventListener("click", () => {
    const panel = document.getElementById("filters-panel");
    if (!panel) return;
    panel.style.display = panel.style.display === "none" ? "block" : "none";
  });

  const getBaseGame = () => document.getElementById("gameInput")?.value.trim();
  document.getElementById("ratingsBtn")?.addEventListener("click", () => {
    window.renderRatingDensity?.(window.currentNeighbors, window.gamesData);
  });

  document.getElementById("mechanicsBtn")?.addEventListener("click", () => {
    const baseGame = getBaseGame();
    if (!baseGame) return;
    window.renderMechanicsBarChart?.(baseGame, window.currentNeighbors, window.gamesData);
  });

  document.getElementById("categoriesBtn")?.addEventListener("click", () => {
    const baseGame = getBaseGame();
    if (!baseGame) return;
    window.renderCategoriesPieChart?.(baseGame, window.currentNeighbors, window.gamesData);
  });

  document.getElementById("publicationsBtn")?.addEventListener("click", () => {
    const baseGame = getBaseGame();
    if (!baseGame) return;
    window.renderPublicationTrend?.(baseGame, window.currentNeighbors, window.gamesData);
  });
  document.getElementById("searchBtn")?.addEventListener("click", () => {
    runSearch(document.getElementById("gameInput")?.value, window.datasets);
  });
  const gameInput = document.getElementById("gameInput");
  gameInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      runSearch(gameInput.value, window.datasets);
    }
  });
  const resetBtn = document.getElementById("resetFiltersBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const sliders = [
        { id: "ratingSlider", value: 6, span: "ratingValue" },
        { id: "playersSlider", value: 4, span: "playersValue" },
        { id: "playtimeSlider", value: 90, span: "playtimeValue" },
        { id: "limitSlider", value: 10, span: "limitSliderValue" }
      ];
      sliders.forEach(({id,value,span}) => {
        const s = document.getElementById(id);
        const t = document.getElementById(span);
        if (s) s.value = value;
        if (t) t.textContent = value;
      });
      [
        "artistInput","publisherInput","designerInput","themeInput",
        "mechanicInput1","mechanicInput2","mechanicInput3"
      ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      const activeFilters = document.getElementById("activeFilters");
      if (activeFilters) activeFilters.innerHTML = "";
    });
  }
});
async function init() {
    const [neighborsData, gamesData, descriptionsData] = await Promise.all([
      d3.json("data/neighbors.json"),
      d3.json("data/games.json"),
      d3.json("data/descriptions.json")
    ]);

    Object.values(gamesData).forEach(g => {
      if (g && g.BGGId && descriptionsData[g.BGGId]) {
        g.description = descriptionsData[g.BGGId];
      }
    });

    window.gamesData = gamesData;
    window.datasets = { neighborsData, gamesData, descriptionsData };

    const gameInput = document.getElementById("gameInput");
    const datalistGames = document.getElementById("games");
    if (gameInput && datalistGames) {
      gameInput.addEventListener("input", () => {
        const val = gameInput.value.toLowerCase();
        const suggestions = Object.keys(gamesData)
          .filter(name => name.toLowerCase().includes(val))
          .slice(0, 10);
        datalistGames.innerHTML = "";
        suggestions.forEach(s => {
          const opt = document.createElement("option");
          opt.value = s;
          datalistGames.appendChild(opt);
        });
      });
    }

    populateDatalist("artists", Object.values(gamesData).map(g => g.artist).filter(Boolean));
    populateDatalist("publishers", Object.values(gamesData).map(g => g.publisher).filter(Boolean));
    populateDatalist("designers", Object.values(gamesData).map(g => g.designer).filter(Boolean));
    populateDatalist("themes", Object.values(gamesData).flatMap(g => g.categories || []));
    populateDatalist("mechanics", Object.values(gamesData).flatMap(g => g.mechanics || []));

    [
      { inputId: "artistInput", datalistId: "artists", source: () => Object.values(gamesData).map(g => g.artist).filter(Boolean) },
      { inputId: "publisherInput", datalistId: "publishers", source: () => Object.values(gamesData).map(g => g.publisher).filter(Boolean) },
      { inputId: "designerInput", datalistId: "designers", source: () => Object.values(gamesData).map(g => g.designer).filter(Boolean) },
      { inputId: "themeInput", datalistId: "themes", source: () => Object.values(gamesData).flatMap(g => g.categories || []) },
      { inputId: "mechanicInput1", datalistId: "mechanics", source: () => Object.values(gamesData).flatMap(g => g.mechanics || []) },
      { inputId: "mechanicInput2", datalistId: "mechanics", source: () => Object.values(gamesData).flatMap(g => g.mechanics || []) },
      { inputId: "mechanicInput3", datalistId: "mechanics", source: () => Object.values(gamesData).flatMap(g => g.mechanics || []) }
    ].forEach(({inputId, datalistId, source}) => {
      const inputEl = document.getElementById(inputId);
      const datalistEl = document.getElementById(datalistId);
      if (inputEl && datalistEl) {
        inputEl.addEventListener("input", () => {
          const val = inputEl.value.toLowerCase();
          const suggestions = source()
            .filter(v => v && v.toLowerCase().includes(val))
            .slice(0, 10);
          datalistEl.innerHTML = "";
          suggestions.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s;
            datalistEl.appendChild(opt);
          });
        });
      }
    });

    [
      { slider: "ratingSlider", span: "ratingValue" },
      { slider: "playersSlider", span: "playersValue" },
      { slider: "playtimeSlider", span: "playtimeValue" },
      { slider: "limitSlider", span: "limitSliderValue" }
    ].forEach(({slider, span}) => {
      const s = document.getElementById(slider);
      const t = document.getElementById(span);
      if (s && t) {
        t.textContent = s.value;
        s.addEventListener("input", () => t.textContent = s.value);
      }
    });

    document.getElementById("searchBtn")?.addEventListener("click", () => {
      runSearch(document.getElementById("gameInput")?.value, window.datasets);
    });

    gameInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        runSearch(gameInput.value, window.datasets);
      }
        });
    const filterOptions = [
    { id: "artistInput", label: "Artist", datalist: "artists" },
    { id: "publisherInput", label: "Publisher", datalist: "publishers" },
    { id: "designerInput", label: "Designer", datalist: "designers" },
    { id: "themeInput", label: "Theme", datalist: "themes" },
    { id: "mechanicInput1", label: "Mechanic 1", datalist: "mechanics" },
    { id: "mechanicInput2", label: "Mechanic 2", datalist: "mechanics" },
    { id: "mechanicInput3", label: "Mechanic 3", datalist: "mechanics" }
    ];

    document.getElementById("helpFindBtn")?.addEventListener("click", () => {
    const panel = document.getElementById("helpFindPanel");
    panel.style.display = "block";
    panel.innerHTML = "";

    const gamesObj = window.gamesData || {};
    const allGames = Object.values(gamesObj);
    const gameKeys = Object.keys(gamesObj);

    if (!allGames.length) {
        alert("Data not loaded yet. Try again in a moment.");
        return;
    }

    const filters = [
        { label: "Publisher", key: "publisher", datalist: "publishers" },
        { label: "Mechanic", key: "mechanics", datalist: "mechanics" },
        { label: "Theme", key: "theme", datalist: "themes" },
        { label: "Designer", key: "designer", datalist: "designers" },
        { label: "Year", key: "year" },
        { label: "Players", key: "players" },
        { label: "Playtime (minutes)", key: "playtime" }
    ];

    const chosen = {};
    let step = 0;

    function parseValue(key, val) {
        if (["players", "playtime", "year"].includes(key)) {
        const n = parseInt(val, 10);
        return Number.isFinite(n) ? n : undefined;
        }
        return val;
    }

    function fits(g, ch) {
        let ok = true;
        if (ch.publisher) ok = ok && g.publisher === ch.publisher;
        if (ch.mechanics) ok = ok && (g.mechanics || []).includes(ch.mechanics);
        if (ch.theme) ok = ok && (g.categories || []).includes(ch.theme);
        if (ch.designer) ok = ok && g.designer === ch.designer;
        if (ch.year) ok = ok && g.year == ch.year;
        if (ch.players) ok = ok && g.minPlayers <= ch.players && g.maxPlayers >= ch.players;
        if (ch.playtime) ok = ok && (g.playtime && Math.abs(g.playtime - ch.playtime) <= g.playtime * 0.2);
        return ok;
    }

    function countMatches(ch) {
        return allGames.filter(g => fits(g, ch)).length;
    }

    function runSearchWithFilters(ch) {
        let candidates = allGames.filter(g => fits(g, ch));
        if (!candidates.length) {
        let maxScore = -1, best = [];
        allGames.forEach(g => {
            let score = 0;
            if (ch.publisher && g.publisher === ch.publisher) score++;
            if (ch.mechanics && (g.mechanics || []).includes(ch.mechanics)) score++;
            if (ch.theme && (g.categories || []).includes(ch.theme)) score++;
            if (ch.designer && g.designer === ch.designer) score++;
            if (ch.year && g.year == ch.year) score++;
            if (ch.players && g.minPlayers <= ch.players && g.maxPlayers >= ch.players) score++;
            if (ch.playtime && g.playtime && Math.abs(g.playtime - ch.playtime) <= g.playtime * 0.2) score++;
            if (score > maxScore) { maxScore = score; best = [g]; }
            else if (score === maxScore) best.push(g);
        });
        candidates = best;
        }

        if (!candidates.length) {
        alert("No games found. Try relaxing filters.");
        return;
        }

        const randomGame = candidates[Math.floor(Math.random() * candidates.length)];
        let key = randomGame.name || Object.keys(gamesObj).find(k => gamesObj[k] === randomGame);

        if (!key) {
        alert("Cannot determine the name of the game");
        return;
        }

        let found = key;
        if (!gamesObj[found]) {
        found = gameKeys.find(k => k.toLowerCase() === String(key).toLowerCase());
        }

        if (found && gamesObj[found]) {
        window.runSearch(found, window.datasets);
        } else {
        alert(`Game found: ${key}, but not in gamesData`);
        }

        panel.style.display = "none";
        panel.innerHTML = "";
    }

    function renderStep() {
        if (step >= filters.length) {
        runSearchWithFilters(chosen);
        return;
        }
        const f = filters[step];
        const count = countMatches(chosen);
        panel.innerHTML = `
        <p>${f.label} (${count} games match so far):
        <input id="helpInput" ${f.datalist ? `list="${f.datalist}"` : ""} placeholder="type or leave empty">
        ${step === filters.length - 1 ? `<button id="searchBtnWizard">Search</button>` : `<button id="nextBtn">Next</button>`}
        <button id="searchNowBtn">Search now</button>
        </p>
        `;

        const inputEl = document.getElementById("helpInput");

        document.getElementById("nextBtn")?.addEventListener("click", () => {
        const val = inputEl.value.trim();
        if (val) {
            const parsed = parseValue(f.key, val);
            if (parsed !== undefined) chosen[f.key] = parsed;
        }
        step++;
        renderStep();
        });

        const doSearch = () => {
        const val = inputEl.value.trim();
        if (val) {
            const parsed = parseValue(f.key, val);
            if (parsed !== undefined) chosen[f.key] = parsed;
        }
        runSearchWithFilters(chosen);
        panel.style.display = "none";
        panel.innerHTML = "";
        };

        document.getElementById("searchBtnWizard")?.addEventListener("click", doSearch);
        document.getElementById("searchNowBtn")?.addEventListener("click", doSearch);
    }

    renderStep();
    });
    document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".chart-selector button").forEach(btn => {
        btn.addEventListener("click", () => {
        document.querySelectorAll(".chart-selector button").forEach(b => b.classList.remove("active-chart"));
        btn.classList.add("active-chart");
        });
    });
    const getBaseGame = () => document.getElementById("gameInput")?.value.trim();

    document.getElementById("ratingsBtn")?.addEventListener("click", () => {
        window.renderRatingHistogram?.(window.currentNeighbors, window.gamesData);
    });

    document.getElementById("mechanicsBtn")?.addEventListener("click", () => {
        const baseGame = getBaseGame();
        if (!baseGame) return;
        window.renderMechanicsBarChart?.(baseGame, window.currentNeighbors, window.gamesData);
    });

    document.getElementById("categoriesBtn")?.addEventListener("click", () => {
        const baseGame = getBaseGame();
        if (!baseGame) return;
        window.renderCategoriesPieChart?.(baseGame, window.currentNeighbors, window.gamesData);
    });

    document.getElementById("publicationsBtn")?.addEventListener("click", () => {
        const baseGame = getBaseGame();
        if (!baseGame) return;
        window.renderPublicationTrend?.(baseGame, window.currentNeighbors, window.gamesData);
    });
    });
    }
    init();