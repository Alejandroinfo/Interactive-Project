function renderGraph(baseGame, neighborsList, gamesData, containerId = "#graph-container") {
  const container = d3.select(containerId);
  container.html(""); 
  const width = 600;
  const height = 400;
  const baseInfo = gamesData[baseGame] || {};

  const nodes = [
    { id: baseGame, type: "base" },
    ...neighborsList.map(n => ({ id: n.name, type: "neighbor", score: n.score }))
  ];

  const links = neighborsList.map(n => {
    const info = gamesData[n.name] || {};
    const sharedMechanics = (baseInfo.mechanics || []).filter(m => (info.mechanics || []).includes(m));
    const sharedThemes = (baseInfo.categories || []).filter(c => (info.categories || []).includes(c));
    let mainReason = "Other";
    if (sharedMechanics.length) mainReason = `Mechanic: ${sharedMechanics[0]}`;
    else if (sharedThemes.length) mainReason = `Theme: ${sharedThemes[0]}`;
    return { source: baseGame, target: n.name, score: n.score, mainReason };
  });

  const uniqueReasons = [...new Set(links.map(d => d.mainReason))];
  const reasonColors = d3.scaleOrdinal(d3.schemeCategory10).domain(uniqueReasons);

  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(d => 250 - (d.score * 200)))
    .force("charge", d3.forceManyBody().strength(-250))
    .force("center", d3.forceCenter(width / 2, height / 2));

  const link = svg.append("g")
    .selectAll("line")
    .data(links)
    .enter().append("line")
    .attr("stroke", d => reasonColors(d.mainReason))
    .attr("stroke-width", d => 2 + (d.score * 8))
link.on("click", (event, d) => {
  const gameA = d.source.id || d.source;
  const gameB = d.target.id || d.target;

  window.selectedComparison = { gameA, gameB };
  window.renderComparison(gameA, gameB, window.gamesData);
});


  const node = svg.append("g")
    .selectAll("circle")
    .data(nodes)
    .enter().append("circle")
    .attr("r", d => d.type === "base" ? 12 : 8)
    .attr("fill", d => d.type === "base" ? "#2196F3" : "#ccc")
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));


  const tooltip = d3.select("body").append("div")
    .attr("class", "graph-tooltip")
    .style("display", "none");

  node.on("mouseover", (event, d) => {
    tooltip.style("display", "block").html(d.id);
  })
  .on("mousemove", (event) => {
    tooltip.style("left", (event.pageX + 10) + "px")
           .style("top", (event.pageY + 10) + "px");
  })
  .on("mouseout", () => {
    tooltip.style("display", "none");
  });

  simulation.on("tick", () => {
    link.attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
    node.attr("cx", d => d.x).attr("cy", d => d.y);
  });

  const legend = svg.append("g")
    .attr("transform", `translate(${width - 160}, 20)`);

  uniqueReasons.forEach((r, i) => {
    legend.append("rect")
      .attr("x", 0)
      .attr("y", i * 20)
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", reasonColors(r));

    legend.append("text")
      .attr("x", 20)
      .attr("y", i * 20 + 10)
      .text(r)
      .attr("font-size", "12px")
      .attr("alignment-baseline", "middle");
  });


  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x; d.fy = d.y;
  }
  function dragged(event, d) {
    d.fx = event.x; d.fy = event.y;
  }
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null; d.fy = null;
  }
}

function renderDensityComparison(baseGame, neighborsList, gamesData, limit = 5000) {
  const containerGlobal = d3.select("#density-global");
  const containerLocal = d3.select("#density-local");
  containerGlobal.html("");
  containerLocal.html("");

  if (!gamesData || !Object.keys(gamesData).length) {
    containerGlobal.append("p").text("No data available.");
    containerLocal.append("p").text("No data available.");
    return;
  }

  const allGames = Object.values(gamesData)
    .filter(d => Number.isFinite(d.avgRating))
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, limit);

  const allRatings = allGames.map(d => d.avgRating);
  const localGames = [gamesData[baseGame], ...neighborsList.map(n => gamesData[n.name])].filter(Boolean);
  const localRatings = localGames.map(g => g.avgRating).filter(Number.isFinite);

  function computeStats(arr) {
    if (!arr.length) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mean = d3.mean(arr);
    const median = d3.median(arr);
    const min = d3.min(arr);
    const max = d3.max(arr);
    return { mean, median, min, max };
  }

  function drawStats(container, stats) {
    if (!stats) return;
    container.append("div")
      .attr("class", "density-stats")
      .html(
        `<b>Mean:</b> ${stats.mean.toFixed(2)} |
         <b>Median:</b> ${stats.median.toFixed(2)} |
         <b>Min:</b> ${stats.min.toFixed(2)} |
         <b>Max:</b> ${stats.max.toFixed(2)}`
      );
  }

  function drawDensity(container, ratings, title, gameList = []) {
    if (!ratings.length) return;

    const width = 380, height = 260;
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };

    const wrapper = container.append("div").style("position", "relative");

    const svg = wrapper.append("svg")
      .attr("width", width)
      .attr("height", height);

    const tooltip = wrapper.append("div")
      .attr("class", "density-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0,0,0,0.85)")
      .style("color", "white")
      .style("padding", "8px 10px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", 50);

    const x = d3.scaleLinear().domain([0, 10]).range([margin.left, width - margin.right]);
    const bins = d3.histogram().domain(x.domain()).thresholds(30)(ratings);
    const total = ratings.length;
    const y = d3.scaleLinear()
      .domain([0, d3.max(bins, d => d.length / total) || 1])
      .range([height - margin.bottom, margin.top]);

    const line = d3.line()
      .x(d => x(d.x0))
      .y(d => y(d.length / total));

    svg.append("path")
      .datum(bins)
      .attr("fill", "none")
      .attr("stroke", "#4CAF50")
      .attr("stroke-width", 2)
      .attr("d", line);

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x));

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", margin.top - 5)
      .attr("text-anchor", "middle")
      .style("font-weight", "bold")
      .text(title);

    svg.append("rect")
      .attr("width", width - margin.left - margin.right)
      .attr("height", height - margin.top - margin.bottom)
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("fill", "transparent")
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event, this);
        const ratingValue = x.invert(mx);
        const bin = bins.find(b => ratingValue >= b.x0 && ratingValue < b.x1);

        if (!bin) {
          tooltip.style("opacity", 0);
          return;
        }

        const matches = bin.map(r => {
          const game = gameList.find(g => g.avgRating === r);
          return game ? `${game.name} (${r.toFixed(2)})` : r.toFixed(2);
        });

        tooltip
          .style("opacity", 1)
          .html(
            `<b>Rating range:</b> ${bin.x0.toFixed(2)}–${bin.x1.toFixed(2)}<br>
             <b>Games:</b><br>
             ${matches.length ? matches.join("<br>") : "None"}`
          )
          .style("left", (event.offsetX + 15) + "px")
          .style("top", (event.offsetY - 40) + "px");
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));
  }

  drawDensity(containerGlobal, allRatings, "Ratings (All games)", allGames);
  drawStats(containerGlobal, computeStats(allRatings));

  drawDensity(containerLocal, localRatings, "Ratings (Base + Neighbors)", localGames);
  drawStats(containerLocal, computeStats(localRatings));
}
function renderMechanicsComparison(baseGame, neighborsList, gamesData, limit = 5000) {
  const containerGlobal = d3.select("#mechanics-global");
  const containerLocal = d3.select("#mechanics-local");
  containerGlobal.html(""); 
  containerLocal.html("");

  if (!gamesData || !Object.keys(gamesData).length) {
    containerGlobal.append("p").text("No data available.");
    containerLocal.append("p").text("No data available.");
    return;
  }

  const allGames = Object.values(gamesData)
    .filter(d => Array.isArray(d.mechanics) && Number.isFinite(d.avgRating))
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, limit);

  const globalMechanics = d3.rollup(
    allGames.flatMap(d => d.mechanics),
    v => v.length,
    d => d
  );


  const localGames = [gamesData[baseGame], ...neighborsList.map(n => gamesData[n.name])].filter(Boolean);
  const localMechanics = d3.rollup(
    localGames.flatMap(d => d.mechanics || []),
    v => v.length,
    d => d
  );

  
  function drawBar(container, dataMap, title) {
    const data = Array.from(dataMap, ([key, value]) => ({key, value}))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); 

    if (!data.length) {
      container.append("p").text("No mechanics data available.");
      return;
    }

    const width = 300, height = 250, margin = {top: 20, right: 20, bottom: 40, left: 80};

    const svg = container.append("svg")
      .attr("width", width)
      .attr("height", height);

    const y = d3.scaleBand()
      .domain(data.map(d => d.key))
      .range([margin.top, height - margin.bottom])
      .padding(0.1);

    const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)])
      .range([margin.left, width - margin.right]);

    svg.selectAll("rect")
      .data(data)
      .enter().append("rect")
      .attr("x", margin.left)
      .attr("y", d => y(d.key))
      .attr("width", d => x(d.value) - margin.left)
      .attr("height", y.bandwidth())
      .attr("fill", "#2196F3");

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(5));

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", margin.top - 5)
      .attr("text-anchor", "middle")
      .style("font-weight", "bold")
      .text(title);
  }


  drawBar(containerGlobal, globalMechanics, "Top mechanics (All games)");
  drawBar(containerLocal, localMechanics, "Top mechanics (Base + neighbors)");
}
function renderThemesComparison(baseGame, neighborsList, gamesData, limit = 5000) {
  const containerGlobal = d3.select("#categories-global");
  const containerLocal = d3.select("#categories-local");
  containerGlobal.html(""); 
  containerLocal.html("");

  if (!gamesData || !Object.keys(gamesData).length) {
    containerGlobal.append("p").text("No data available.");
    containerLocal.append("p").text("No data available.");
    return;
  }

  const allGames = Object.values(gamesData)
    .filter(d => Array.isArray(d.categories) && Number.isFinite(d.avgRating))
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, limit);

  const globalCategories = d3.rollup(
    allGames.flatMap(d => d.categories),
    v => v.length,
    d => d
  );

  const localGames = [gamesData[baseGame], ...neighborsList.map(n => gamesData[n.name])].filter(Boolean);
  const localCategories = d3.rollup(
    localGames.flatMap(d => d.categories || []),
    v => v.length,
    d => d
  );

  function drawPie(container, dataMap, title) {
  const data = Array.from(dataMap, ([key, value]) => ({key, value}))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  if (!data.length) {
    container.append("p").text("No categories data available.");
    return;
  }

  const width = 380, height = 260;
  const radius = 100;

  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text(title);

  const chartGroup = svg.append("g")
    .attr("transform", `translate(${radius + 20}, ${radius + 40})`);

  const pie = d3.pie().value(d => d.value);
  const arc = d3.arc().innerRadius(0).outerRadius(radius);
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  chartGroup.selectAll("path")
    .data(pie(data))
    .enter().append("path")
    .attr("d", arc)
    .attr("fill", d => color(d.data.key));

  const legend = svg.append("g")
    .attr("transform", `translate(${radius * 2 + 40}, 40)`);
  legend.selectAll("rect")
    .data(data)
    .enter().append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * 20)
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", d => color(d.key));

  legend.selectAll("text")
    .data(data)
    .enter().append("text")
    .attr("x", 18)
    .attr("y", (d, i) => i * 20 + 10)
    .style("font-size", "12px")
    .text(d => d.key);
}

  drawPie(containerGlobal, globalCategories, "Categories (All games)");
  drawPie(containerLocal, localCategories, "Categories (Base + neighbors)");
}
function renderPublicationComparison(baseGame, neighborsList, gamesData, limit = 5000) {
  const mount = d3.select("#publications-graph");
  mount.html("");

  if (!gamesData || typeof gamesData !== "object") {
    mount.append("p").text("No data available.");
    return;
  }

  const MIN_YEAR = 1950;
  const MAX_YEAR = 2030;
  let allGames = Object.values(gamesData)
    .map(d => ({ name: d.name, year: d.year, rating: d.avgRating }))
    .filter(d => Number.isFinite(d.year) && d.year >= MIN_YEAR && d.year <= MAX_YEAR);

  allGames = allGames
    .filter(d => Number.isFinite(d.rating))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);

  const globalCounts = d3.rollup(allGames, v => v.length, d => d.year);
  const baseInfo = gamesData[baseGame];
  const localGames = [
    ...(baseInfo ? [baseInfo] : []),
    ...neighborsList.map(n => gamesData[n.name]).filter(Boolean)
  ]
    .map(d => ({ name: d.name, year: d.year, rating: d.avgRating }))
    .filter(d =>
      Number.isFinite(d.year) &&
      Number.isFinite(d.rating) &&
      d.year >= MIN_YEAR &&
      d.year <= MAX_YEAR
    );

  function drawGlobal(container, dataMap, title) {
    const data = Array.from(dataMap, ([year, count]) => ({ year, count }))
      .filter(d => d.year >= MIN_YEAR && d.year <= MAX_YEAR)
      .sort((a, b) => a.year - b.year);

    if (!data.length) {
      container.append("p").text("No global publication data available.");
      return;
    }

    const width = 360, height = 260, m = { top: 30, right: 20, bottom: 45, left: 55 };
    const svg = container.append("svg").attr("width", width).attr("height", height);

    const x = d3.scaleBand()
      .domain(data.map(d => d.year))
      .range([m.left, width - m.right])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count)])
      .nice()
      .range([height - m.bottom, m.top]);

    svg.selectAll("rect").data(data).enter().append("rect")
      .attr("x", d => x(d.year))
      .attr("y", d => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", d => y(0) - y(d.count))
      .attr("fill", "#2196F3");


    svg.append("g")
      .attr("transform", `translate(0,${height - m.bottom})`)
      .call(
        d3.axisBottom(x)
          .tickValues(x.domain().filter((d, i) => i % 5 === 0))
          .tickFormat(d3.format("d"))
      );

    svg.append("g")
      .attr("transform", `translate(${m.left},0)`)
      .call(d3.axisLeft(y).ticks(6));

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", m.top - 10)
      .attr("text-anchor", "middle")
      .style("font-weight", "bold")
      .text(title);
  }

  function drawLocal(container, games, title) {
    if (!games.length) {
      container.append("p").text("No local publication data available.");
      return;
    }

    const width = 360, height = 260, m = { top: 30, right: 20, bottom: 45, left: 55 };
    const svg = container.append("svg").attr("width", width).attr("height", height);

    const x = d3.scaleLinear()
      .domain([MIN_YEAR, MAX_YEAR])
      .range([m.left, width - m.right]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(games, d => d.rating)])
      .nice()
      .range([height - m.bottom, m.top]);

    svg.selectAll("circle").data(games).enter().append("circle")
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.rating))
      .attr("r", 4)
      .attr("fill", "#FF9800")
      .append("title")
      .text(d => `${d.name} (${d.year}) - Rating: ${d.rating.toFixed(2)}`);

    svg.append("g")
      .attr("transform", `translate(0,${height - m.bottom})`)
      .call(
        d3.axisBottom(x)
          .ticks(10)
          .tickFormat(d3.format("d"))
      );

    svg.append("g")
      .attr("transform", `translate(${m.left},0)`)
      .call(d3.axisLeft(y).ticks(6));

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", m.top - 10)
      .attr("text-anchor", "middle")
      .style("font-weight", "bold")
      .text(title);
  }

  const globalDiv = mount.append("div").attr("class", "pub-global");
  const localDiv = mount.append("div").attr("class", "pub-local");
  drawGlobal(globalDiv, globalCounts, "Publications (All games)");
  drawLocal(localDiv, localGames, "Publications (Base + neighbors)");
}


window.renderGraph = renderGraph
window.renderDensityComparison = renderDensityComparison
window.renderThemesComparison = renderThemesComparison
window.renderMechanicsComparison = renderMechanicsComparison
window.renderPublicationComparison = renderPublicationComparison