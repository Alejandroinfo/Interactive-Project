function formatRating(gameName, gamesData) {
  const ratings = Object.values(gamesData)
    .map(g => g.avgRating)
    .filter(r => Number.isFinite(r))
    .sort((a,b) => b - a);
  const rating = gamesData[gameName]?.avgRating ?? NaN;
  if (!Number.isFinite(rating)) return "N/A";

  const rounded = rating.toFixed(2);
  const position = ratings.indexOf(rating) + 1; // puesto
  return `${rounded} (#${position})`;
}

function renderSelectedGameInfo(gameName, gamesData, neighborsList) {
  const info = gamesData[gameName];
  if (!info) return;

  const amazonUrl = `https://www.amazon.com/s?k=${encodeURIComponent(gameName)}+board+game`;
  const imgSrc = info.image && info.image !== "" ? info.image : "images/placeholder.png";

  // Card del juego base
  const htmlBlock = `
    <div style="flex:1;">
      <h3>${gameName}</h3>
      <img src="${imgSrc}" alt="${gameName}"
           style="width:150px;height:150px;object-fit:cover;border-radius:6px;margin-bottom:10px;">
      <p>⭐ Rating: ${formatRating(gameName, gamesData)}</p>
      <p>👥 Players: ${info.minPlayers ?? "?"}–${info.maxPlayers ?? "?"}</p>
      <p>⏱️ Playtime: ${info.playtime ?? "?"} min</p>
      <p>🎨 Artist: ${info.artist || "N/A"}</p>
      <p>🏢 Publisher: ${info.publisher || "N/A"}</p>
      <p>✍️ Designer: ${info.designer || "N/A"}</p>
      <p>🎲 Mechanics: ${(info.mechanics || []).join(", ") || "N/A"}</p>
      <p>📂 Categories: ${(info.categories || []).join(", ") || "N/A"}</p>
      ${info.BGGId ? `<a href="https://boardgamegeek.com/boardgame/${info.BGGId}" target="_blank" class="bgg-btn">View on BGG</a>` : ""}
      <a href="${amazonUrl}" target="_blank" class="amazon-btn">View on Amazon</a>
    </div>
  `;

  // ✅ Renderizar solo una vez
  d3.select("#selected-game-info-results").html(htmlBlock);

  // ✅ Limpiar y renderizar el gráfico
  d3.select("#graph-container").html("");
  if (Array.isArray(neighborsList) && neighborsList.length > 0) {
    renderGraph(gameName, neighborsList, gamesData);
  }
}

function renderCards(baseGame, neighborsList, gamesData) {
  const container = d3.select("#results");
  container.html(""); 
  let tooltip = d3.select("body").select(".card-tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body").append("div")
      .attr("class", "card-tooltip")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("display", "none");
  }

  neighborsList.forEach(n => {
    const info = gamesData[n.name];
    if (!info) return;

    const card = container.append("div").attr("class", "result-card");
    card.append("img")
      .attr("src", info.image || "images/placeholder.png")
      .attr("alt", n.name)
      .attr("class", "game-img");

    const infoDiv = card.append("div").attr("class", "game-info");
    const header = infoDiv.append("div").attr("class", "card-header");
    header.append("h4").text(n.name);

    const amazonUrl = `https://www.amazon.com/s?k=${encodeURIComponent(n.name)}+board+game`;
    header.append("a")
      .attr("href", amazonUrl)
      .attr("target","_blank")
      .attr("class","amazon-btn")
      .text("View on Amazon");

    if (info.BGGId) {
      header.append("a")
        .attr("href", `https://boardgamegeek.com/boardgame/${info.BGGId}`)
        .attr("target","_blank")
        .attr("class","bgg-btn")
        .text("View on BGG");
    }

    header.append("button")
      .attr("class", "set-base-btn")
      .text("Set as base game")
      .on("click", (event) => {
        event.stopPropagation();
        window.runSearch(n.name, window.datasets);
      });

    infoDiv.append("p")
      .text(`⭐ ${formatRating(n.name, gamesData)} | ⏱️ ${info.playtime ?? "?"} min`);

    const reasonsPanel = card.append("div").attr("class", "match-reasons-panel");
    const reasonsHeader = reasonsPanel.append("div").attr("class", "reasons-header");
    reasonsHeader.append("h5").text("Match reasons");
    reasonsHeader.append("button")
      .attr("class", "close-btn")
      .text("✖ Close")
      .on("click", (event) => {
        event.stopPropagation();
        card.classed("expanded", false);
      });

    const ul = reasonsPanel.append("ul");
    const reasons = Array.isArray(n.reasons) ? n.reasons : [];
    if (reasons.length > 0) {
      reasons.forEach(r => ul.append("li").text(String(r)));
    } else {
      ul.append("li").text("No match reasons available.");
    }

    const extra = [
      {label: "Year", value: info.year ?? "N/A"},
      {label: "Artist", value: info.artist || "N/A"},
      {label: "Publisher", value: info.publisher || "N/A"},
      {label: "Designer", value: info.designer || "N/A"},
      {label: "Min players", value: info.minPlayers ?? "N/A"},
      {label: "Max players", value: info.maxPlayers ?? "N/A"},
      {label: "Playtime", value: (info.playtime ?? "N/A") + " min"}
    ];
    const tooltipHtml = `
      <div class="tooltip-content">
        ${extra.map(e => `<div><strong>${e.label}:</strong> ${e.value}</div>`).join("")}
      </div>
    `;

    card.on("mousemove", (event) => {
      tooltip.style("left", (event.pageX + 12) + "px")
             .style("top", (event.pageY + 12) + "px")
             .style("display", "block")
             .html(tooltipHtml);
    }).on("mouseleave", () => {
      tooltip.style("display", "none");
    });

    card.on("click", function(event) {
      if (event.target.tagName.toLowerCase() === "button" || event.target.tagName.toLowerCase() === "a") return;
      d3.selectAll(".result-card").classed("expanded", false);
      d3.select(this).classed("expanded", true);
    });
  });
}
function renderWordCloud(baseGame, neighborsList, gamesData) {

  const container = d3.select("#wordcloud-graph");
  container.html("");
    const bounding = container.node().getBoundingClientRect();
  const width = bounding.width || 700;
  const height = bounding.height || 500;
  const descriptions = neighborsList
    .map(n => gamesData[n.name]?.description || "")
    .filter(desc => desc.length > 0);

  if (!descriptions.length) {
    container.append("p").text("No description data available for Word Cloud.");
    return;
  }

  const words = descriptions
    .join(" ")
    .toLowerCase()
    .replace(/[^a-záéíóúñü\s]/gi, "")
    .split(/\s+/)
    .filter(w => w.length > 3);

  const frequency = d3.rollup(words, v => v.length, d => d);
  const data = Array.from(frequency, ([text, size]) => ({ text, size }));
  const layout = d3.layout.cloud()
    .size([width, height])
    .words(data.map(d => ({
      text: d.text,
      size: 12 + d.size * 1.3 
    })))
    .padding(3)
    .rotate(() => 0) 
    .fontSize(d => d.size)
    .on("end", draw);

  layout.start();
  function draw(words) {

    const svg = container.append("svg")
      .attr("width", "100%")
      .attr("height", height) 
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    svg.append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`)
      .selectAll("text")
      .data(words)
      .enter()
      .append("text")
      .style("font-size", d => d.size + "px")
      .style("fill", (d, i) => d3.schemeCategory10[i % 10])
      .attr("text-anchor", "middle")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .text(d => d.text);
  }
}

function renderComparison(gameA, gameB, gamesData) {
  openTab("comparisonTab");

  const container = d3.select("#comparison-graph");
  container.html("");
  const dataA = gamesData[gameA] || {};
  const dataB = gamesData[gameB] || {};
  const table = container.append("table").attr("class", "comparison-table");

  table.append("thead").html(`
    <tr>
      <th>Attribute</th>
      <th>${gameA}</th>
      <th>${gameB}</th>
    </tr>
  `);

  const tbody = table.append("tbody");

  const attributes = ["year", "players", "playtime", "rating", "categories", "mechanics"];
  attributes.forEach(attr => {
    const valA = dataA[attr] ? (Array.isArray(dataA[attr]) ? dataA[attr].join(", ") : dataA[attr]) : "-";
    const valB = dataB[attr] ? (Array.isArray(dataB[attr]) ? dataB[attr].join(", ") : dataB[attr]) : "-";

    tbody.append("tr").html(`
      <td>${attr.charAt(0).toUpperCase() + attr.slice(1)}</td>
      <td>${valA}</td>
      <td>${valB}</td>
    `);
  });

  container.append("h4").text("Shared Mechanics:");
  const sharedMechanics = (dataA.mechanics || []).filter(m => (dataB.mechanics || []).includes(m));
  container.append("p").text(sharedMechanics.length ? sharedMechanics.join(", ") : "None");
  container.append("h4").text("Shared Categories:");
  const sharedCategories = (dataA.categories || []).filter(c => (dataB.categories || []).includes(c));
  container.append("p").text(sharedCategories.length ? sharedCategories.join(", ") : "None");
}

window.renderSelectedGameInfo = renderSelectedGameInfo;
window.renderCards = renderCards;