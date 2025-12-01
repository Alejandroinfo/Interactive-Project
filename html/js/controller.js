function runSearch(baseGame, datasets) {
  const { neighborsData, gamesData } = datasets;
  if (!baseGame || !gamesData[baseGame]) {
    d3.select("#results").html("");
    d3.select("#graph").html("");
    d3.select("#selected-game-info").html("");
    d3.select("#selected-game-info-results").html("");
    d3.select("#other-graph").html("");
    return;
  }
  document.getElementById("gameInput").value = baseGame;
  window.renderSelectedGameInfo?.(baseGame, gamesData);
  const excludePrefix = !!document.getElementById("excludePrefix")?.checked;
  const minRating = parseFloat(document.getElementById("ratingSlider")?.value ?? "6");
  const limit = parseInt(document.getElementById("limitSlider")?.value ?? "10", 10);
  const players = parseInt(document.getElementById("playersSlider")?.value ?? "NaN", 10);
  const playtime = parseInt(document.getElementById("playtimeSlider")?.value ?? "NaN", 10);

  const artistFilter = document.getElementById("artistInput")?.value || "";
  const publisherFilter = document.getElementById("publisherInput")?.value || "";
  const designerFilter = document.getElementById("designerInput")?.value || "";
  const themeFilter = document.getElementById("themeInput")?.value || "";
  const mechanicFilters = window.getMechanicFilters?.() || [];
  let neighborsList = Array.isArray(neighborsData[baseGame])
    ? [...neighborsData[baseGame]]
    : [];

  neighborsList = neighborsList.filter(n => n.name !== baseGame);

  if (excludePrefix) {
    neighborsList = neighborsList.filter(n => !String(n.name || "").startsWith(baseGame));
  }

  neighborsList = neighborsList.filter(n => {
    const info = gamesData[n.name];
    if (!info) return false;

    if (Number.isFinite(minRating) && info.avgRating < minRating) return false;
    if (Number.isFinite(players)) {
      if (!(info.minPlayers <= players && info.maxPlayers >= players)) return false;
    }
    if (Number.isFinite(playtime)) {
      if (!Number.isFinite(info.playtime) || Math.abs(info.playtime - playtime) > 30) return false;
    }
    if (artistFilter && info.artist !== artistFilter) return false;
    if (publisherFilter && info.publisher !== publisherFilter) return false;
    if (designerFilter && info.designer !== designerFilter) return false;
    if (themeFilter) {
      const cats = Array.isArray(info.categories) ? info.categories : [];
      if (!cats.includes(themeFilter)) return false;
    }
    if (mechanicFilters.length > 0) {
      const mechs = Array.isArray(info.mechanics) ? info.mechanics : [];
      for (let m of mechanicFilters) {
        if (!mechs.includes(m)) return false;
      }
    }
    return true;
  });
  const activeFilters = [];
if (artistFilter) activeFilters.push(`Artist: ${artistFilter}`);
if (publisherFilter) activeFilters.push(`Publisher: ${publisherFilter}`);
if (designerFilter) activeFilters.push(`Designer: ${designerFilter}`);
if (themeFilter) activeFilters.push(`Theme: ${themeFilter}`);
mechanicFilters.forEach((m,i) => activeFilters.push(`Mechanic ${i+1}: ${m}`));

document.getElementById("activeFilters").innerHTML = activeFilters.map(f => `<span class="filter-tag">${f}</span>`).join(" ");
  neighborsList = neighborsList.map(n => {
    let reasons =
      (Array.isArray(n.reasons) && n.reasons.length ? n.reasons : null) ||
      (Array.isArray(n.reason) && n.reason.length ? n.reason : null) ||
      (Array.isArray(n.meta?.reasons) && n.meta.reasons.length ? n.meta.reasons : null);

    if (!reasons || reasons.length === 0) {
      reasons = window.explainMatch(baseGame, n.name, gamesData);
    }

    return { ...n, reasons };
  });

  neighborsList = neighborsList.slice(0, Math.max(0, limit));
  window.currentNeighbors = neighborsList;
  window.renderCards?.(baseGame, neighborsList, gamesData);
  window.renderGraph?.(baseGame, neighborsList, gamesData);
  window.renderRatingHistogram?.(neighborsList, gamesData);
  window.renderMechanicsBarChart?.(baseGame, neighborsList, gamesData);
  window.renderCategoriesPieChart?.(baseGame, neighborsList, gamesData);
  window.renderPublicationTrend?.(baseGame, neighborsList, gamesData);
}

window.runSearch = runSearch;