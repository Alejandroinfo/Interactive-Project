
function renderSelectedGameInfo(gameName, gamesData) {
  const info = gamesData[gameName];
  if (!info) return;

  const imgSrc = info.image && info.image !== "" ? info.image : "images/placeholder.png";
  const shortDesc = info.description ? info.description.slice(0, 300) : "No description available.";
  const fullDesc = info.description || "";
  const htmlBlock = `
    <div style="display:flex; gap:20px;">
      <div style="flex:1;">
        <h3>${gameName}</h3>
        <img src="${imgSrc}" alt="${gameName}"
             style="width:150px;height:150px;object-fit:cover;border-radius:6px;margin-bottom:10px;">
        <p id="desc-${gameName}">${shortDesc}${info.description && info.description.length > 300 ? '... <a href="#" id="see-more-'+gameName+'">see more</a>' : ''}</p>
      </div>
      <div style="flex:1;">
        <p>⭐ Rating: ${info.avgRating ?? "N/A"}</p>
        <p>👥 Players: ${info.minPlayers ?? "?"}–${info.maxPlayers ?? "?"}</p>
        <p>⏱️ Playtime: ${info.playtime ?? "?"} min</p>
        <p>🎨 Artist: ${info.artist || "N/A"}</p>
        <p>🏢 Publisher: ${info.publisher || "N/A"}</p>
        <p>✍️ Designer: ${info.designer || "N/A"}</p>
        <p>🎲 Mechanics: ${(info.mechanics || []).join(", ") || "N/A"}</p>
        <p>📂 Categories: ${(info.categories || []).join(", ") || "N/A"}</p>
        ${info.BGGId ? `<a href="https://boardgamegeek.com/boardgame/${info.BGGId}" target="_blank" class="bgg-btn">View on BGG</a>` : ""}
      </div>
    </div>
  `;

  d3.select("#selected-game-info").html(htmlBlock);
  d3.select("#selected-game-info-results").html(htmlBlock);

  const seeMore = document.getElementById(`see-more-${gameName}`);
  const descEl = document.getElementById(`desc-${gameName}`);
  if (seeMore && descEl) {
    seeMore.addEventListener("click", (e) => {
      e.preventDefault();
      descEl.textContent = fullDesc;
    });
  }
}

function renderCards(baseGame, neighborsList, gamesData) {
  const container = d3.select("#results")
  container.html("")

  neighborsList.forEach(n => {
    const info = gamesData[n.name]
    if (!info) return

    const card = container.append("div").attr("class", "result-card")

    card.append("img")
      .attr("src", info.image || "images/placeholder.png")
      .attr("alt", n.name)
      .attr("class", "game-img")

    const infoDiv = card.append("div").attr("class", "game-info")
    const header = infoDiv.append("div").attr("class", "card-header")
    header.append("h4").text(n.name)

    const amazonUrl = `https://www.amazon.com/s?k=${encodeURIComponent(n.name)}+board+game`
    header.append("a")
      .attr("href", amazonUrl)
      .attr("target","_blank")
      .attr("class","amazon-btn")
      .text("View on Amazon")

    if (info.BGGId) {
      header.append("a")
        .attr("href", `https://boardgamegeek.com/boardgame/${info.BGGId}`)
        .attr("target","_blank")
        .attr("class","bgg-btn")
        .text("View on BGG")
    }

    header.append("button")
      .attr("class", "set-base-btn")
      .text("Set as base game")
      .on("click", (event) => {
        event.stopPropagation()
        window.runSearch(n.name, window.datasets)
      })

    header.append("button")
      .attr("class", "close-btn-top")
      .text("✖ Back to grid")
      .on("click", (event) => {
        event.stopPropagation()
        card.classed("expanded", false)
      })

    infoDiv.append("p").text(`⭐ ${info.avgRating ?? "N/A"} | ⏱️ ${info.playtime ?? "?"} min`)
    const reasonsPanel = card.append("div").attr("class", "match-reasons-panel")
    const reasonsHeader = reasonsPanel.append("div").attr("class", "reasons-header")
    reasonsHeader.append("h5").text("Match reasons")
    reasonsHeader.append("button")
      .attr("class", "close-btn")
      .text("✖ Close")
      .on("click", (event) => {
        event.stopPropagation()
        card.classed("expanded", false)
      })

    const ul = reasonsPanel.append("ul")
    const reasons = Array.isArray(n.reasons) ? n.reasons : []
    if (reasons.length > 0) {
      reasons.forEach(r => ul.append("li").text(String(r)))
    } else {
      ul.append("li").text("No match reasons available.")
    }

    const tooltip = d3.select("body").append("div")
      .attr("class", "card-tooltip")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("display", "none")

    const extra = [
      {label: "Year", value: info.year ?? "N/A"},
      {label: "Artist", value: info.artist || "N/A"},
      {label: "Publisher", value: info.publisher || "N/A"},
      {label: "Designer", value: info.designer || "N/A"},
      {label: "Min players", value: info.minPlayers ?? "N/A"},
      {label: "Max players", value: info.maxPlayers ?? "N/A"},
      {label: "Playtime", value: (info.playtime ?? "N/A") + " min"}
    ]

    const tooltipHtml = `
      <div class="tooltip-content">
        ${extra.map(e => `<div><strong>${e.label}:</strong> ${e.value}</div>`).join("")}
      </div>
    `

    card.on("mousemove", (event) => {
      tooltip.style("left", (event.pageX + 12) + "px")
             .style("top", (event.pageY + 12) + "px")
             .style("display", "block")
             .html(tooltipHtml)
    }).on("mouseleave", () => {
      tooltip.style("display", "none")
    })

    card.on("click", function(event) {
      if (event.target.tagName.toLowerCase() === "button" || event.target.tagName.toLowerCase() === "a") return
      d3.selectAll(".result-card").classed("expanded", false)
      d3.select(this).classed("expanded", true)
    })
  })
}
window.renderNetworkCloud = function(gamesData) {
  const container = d3.select("#other-graph");
  container.html("<h3>Network Cloud (mecánicas)</h3>");
  const mechCounts = {};
  const links = [];
  Object.values(gamesData).forEach(g => {
    const mechs = g.mechanics || [];
    for (let i=0; i<mechs.length; i++) {
      mechCounts[mechs[i]] = (mechCounts[mechs[i]]||0)+1;
      for (let j=i+1; j<mechs.length; j++) {
        links.push({source: mechs[i], target: mechs[j]});
      }
    }
  });

  const nodes = Object.keys(mechCounts).map(m => ({id:m, size:mechCounts[m]}));

  const width = 600, height = 400;
  const svg = container.append("svg").attr("width", width).attr("height", height);

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(100))
    .force("charge", d3.forceManyBody().strength(-50))
    .force("center", d3.forceCenter(width/2, height/2));

  const link = svg.append("g").selectAll("line")
    .data(links).enter().append("line")
    .attr("stroke","#999").attr("stroke-opacity",0.6);

  const node = svg.append("g").selectAll("circle")
    .data(nodes).enter().append("circle")
    .attr("r", d => Math.sqrt(d.size))
    .attr("fill","steelblue")
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

  const label = svg.append("g").selectAll("text")
    .data(nodes).enter().append("text")
    .text(d => d.id)
    .attr("font-size","10px");

  simulation.on("tick", () => {
    link.attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
    node.attr("cx", d => d.x).attr("cy", d => d.y);
    label.attr("x", d => d.x+5).attr("y", d => d.y+5);
  });

  function dragstarted(event,d){ if(!event.active) simulation.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; }
  function dragged(event,d){ d.fx=event.x; d.fy=event.y; }
  function dragended(event,d){ if(!event.active) simulation.alphaTarget(0); d.fx=null; d.fy=null; }
};
window.renderComparison = function(gameA, gameB, gamesData) {
  const infoA = gamesData[gameA];
  const infoB = gamesData[gameB];
  if (!infoA || !infoB) return;

  const container = d3.select("#other-graph");
  container.html(`<h3>Comparison: ${gameA} vs ${gameB}</h3>`);
  const data = [
    { axis: "Rating", A: infoA.avgRating, B: infoB.avgRating },
    { axis: "Min Players", A: infoA.minPlayers, B: infoB.minPlayers },
    { axis: "Max Players", A: infoA.maxPlayers, B: infoB.maxPlayers },
    { axis: "Playtime", A: infoA.playtime, B: infoB.playtime }
  ];

  const table = container.append("table").attr("class", "comparison-table");
  table.append("tr").html(`<th>Metric</th><th>${gameA}</th><th>${gameB}</th>`);
  data.forEach(row => {
    table.append("tr").html(`
      <td>${row.axis}</td>
      <td>${row.A ?? "N/A"}</td>
      <td>${row.B ?? "N/A"}</td>
    `);
  });
  const mechsA = new Set(infoA.mechanics || []);
  const mechsB = new Set(infoB.mechanics || []);
  const sharedMechs = [...mechsA].filter(m => mechsB.has(m));
  const onlyMechsA = [...mechsA].filter(m => !mechsB.has(m));
  const onlyMechsB = [...mechsB].filter(m => !mechsA.has(m));
  const themesA = new Set(infoA.categories || []);
  const themesB = new Set(infoB.categories || []);
  const sharedThemes = [...themesA].filter(t => themesB.has(t));
  const onlyThemesA = [...themesA].filter(t => !themesB.has(t));
  const onlyThemesB = [...themesB].filter(t => !themesA.has(t));
  if (sharedMechs.length || sharedThemes.length ||
      (infoA.designer && infoA.designer === infoB.designer) ||
      (infoA.publisher && infoA.publisher === infoB.publisher) ||
      (infoA.artist && infoA.artist === infoB.artist)) {
    container.append("h4").text("Shared Information");
    if (sharedMechs.length) {
      container.append("p").html(`<b>Shared mechanics:</b> ${sharedMechs.join(", ")}`);
    }
    if (sharedThemes.length) {
      container.append("p").html(`<b>Shared themes:</b> ${sharedThemes.join(", ")}`);
    }
    if (infoA.designer && infoA.designer === infoB.designer) {
      container.append("p").html(`<b>Shared designer:</b> ${infoA.designer}`);
    }
    if (infoA.publisher && infoA.publisher === infoB.publisher) {
      container.append("p").html(`<b>Shared publisher:</b> ${infoA.publisher}`);
    }
    if (infoA.artist && infoA.artist === infoB.artist) {
      container.append("p").html(`<b>Shared artist:</b> ${infoA.artist}`);
    }
  }

  container.append("h4").text("Unique Information");
  container.append("p").html(`<b>Only ${gameA}:</b> Mechanics: ${onlyMechsA.join(", ") || "None"}; Themes: ${onlyThemesA.join(", ") || "None"}`);
  container.append("p").html(`<b>Only ${gameB}:</b> Mechanics: ${onlyMechsB.join(", ") || "None"}; Themes: ${onlyThemesB.join(", ") || "None"}`);
};
window.renderSelectedGameInfo = renderSelectedGameInfo;
window.renderCards = renderCards;