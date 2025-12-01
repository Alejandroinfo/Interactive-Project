function renderGraph(baseGame, neighborsList, gamesData) {
  const svg = d3.select("#graph");
  svg.html("");
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
    const sharedDesigners = baseInfo.designer && info.designer && baseInfo.designer === info.designer ? [info.designer] : [];

    let mainReason = "Other";
    if (sharedMechanics.length) mainReason = `Mechanic: ${sharedMechanics[0]}`;
    else if (sharedThemes.length) mainReason = `Theme: ${sharedThemes[0]}`;
    else if (sharedDesigners.length) mainReason = `Designer: ${sharedDesigners[0]}`;

    return { source: baseGame, target: n.name, score: n.score, mainReason, sharedMechanics, sharedThemes };
  });

  const uniqueReasons = [...new Set(links.map(d => d.mainReason))];
  const reasonColors = d3.scaleOrdinal(d3.schemeCategory10).domain(uniqueReasons);
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(d => 250 - (d.score * 200)))
    .force("charge", d3.forceManyBody().strength(-250))
    .force("center", d3.forceCenter(width / 2, height / 2));

  const svgEl = svg.append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("display", "block")
    .style("margin", "0 auto");

  const link = svgEl.append("g")
    .selectAll("line")
    .data(links)
    .enter().append("line")
    .attr("stroke", d => reasonColors(d.mainReason))
    .attr("stroke-width", d => 2 + (d.score * 8))
    .on("click", (event, d) => {
      const gameA = d.source.id || d.source;
      const gameB = d.target.id || d.target;
      const infoA = gamesData[gameA] || {};
      const infoB = gamesData[gameB] || {};
      const sharedMechanics = d.sharedMechanics || [];
      const sharedThemes = d.sharedThemes || [];
      const uniqueMechanicsA = (infoA.mechanics || []).filter(m => !sharedMechanics.includes(m));
      const uniqueMechanicsB = (infoB.mechanics || []).filter(m => !sharedMechanics.includes(m));
      const uniqueThemesA = (infoA.categories || []).filter(c => !sharedThemes.includes(c));
      const uniqueThemesB = (infoB.categories || []).filter(c => !sharedThemes.includes(c));

      window.renderComparison(gameA, gameB, window.gamesData, {
        sharedMechanics,
        sharedThemes,
        uniqueMechanicsA,
        uniqueMechanicsB,
        uniqueThemesA,
        uniqueThemesB
      });
      window.openTab && window.openTab("extraTab");
    });

  const node = svgEl.append("g")
    .selectAll("circle")
    .data(nodes)
    .enter().append("circle")
    .attr("r", d => d.type === "base" ? 12 : 8)
    .attr("fill", d => d.type === "base" ? "#2196F3" : "#ccc")
    .on("click", (event, d) => {
      if (d.type === "neighbor") {
        window.runSearch(d.id, window.datasets);
      }
    })
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

  const label = svgEl.append("g")
    .selectAll("text")
    .data(nodes)
    .enter().append("text")
    .text(d => d.id)
    .attr("font-size", "10px")
    .attr("dx", 12)
    .attr("dy", ".35em");

  simulation.on("tick", () => {
    link.attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
    node.attr("cx", d => d.x).attr("cy", d => d.y);
    label.attr("x", d => d.x).attr("y", d => d.y);
  });

  const legend = svgEl.append("g").attr("transform", `translate(${width - 160}, 20)`);
  uniqueReasons.forEach((r, i) => {
    legend.append("rect").attr("x", 0).attr("y", i * 20).attr("width", 12).attr("height", 12).attr("fill", reasonColors(r));
    legend.append("text").attr("x", 20).attr("y", i * 20 + 10).text(r).attr("font-size", "12px");
  });

  function dragstarted(event, d) { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }
  function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
  function dragended(event, d) { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }
}
function renderRatingDensity(neighborsList, gamesData) {
  const svg = d3.select("#other-graph");
  svg.html("");
  const width = 600;
  const height = 300;
  const ratings = neighborsList
    .map(n => gamesData[n.name]?.avgRating)
    .filter(r => typeof r === "number");

  if (!ratings.length) {
    svg.append("p").text("No rating data available for current matches.");
    return;
  }

  const x = d3.scaleLinear().domain([0, 10]).range([40, width - 20]);
  const kde = Kernel_estimartor(epac_kernel(0.3), x.ticks(40));
  const density = kde(ratings);

  const y = d3.scaleLinear()
    .domain([0, d3.max(density, d => d[1])])
    .range([height - 30, 20]);

  const svgEl = svg.append("svg")
    .attr("width", width)
    .attr("height", height + 60)
    .style("display", "block")
    .style("margin", "0 auto");
  svgEl.append("path")
    .datum(density)
    .attr("fill", "#69b3a2")
    .attr("opacity", 0.5)
    .attr("stroke", "#000")
    .attr("stroke-width", 1.5)
    .attr("stroke-linejoin", "round")
    .attr("d", d3.line()
      .curve(d3.curveBasis)
      .x(d => x(d[0]))
      .y(d => y(d[1]))
    );
  svgEl.append("g")
    .attr("transform", `translate(0,${height - 30})`)
    .call(d3.axisBottom(x));
  svgEl.append("g")
    .attr("transform", "translate(40,0)")
    .call(d3.axisLeft(y));
  svgEl.append("text")
    .attr("x", width / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Density of Average Ratings");
  svgEl.append("text")
    .attr("x", width / 2)
    .attr("y", height + 20)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Average Rating");

  svgEl.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 15)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Density");
  function Kernel_estimartor(kernel, X) {
    return function(V) {
      return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
    };
  }
  function epac_kernel(bandwidth) {
    return function(u) {
      u /= bandwidth;
      return Math.abs(u) <= 1 ? 0.75 * (1 - u * u) / bandwidth : 0;
    };
  }
}
function renderMechanicsBarChart(baseGame, neighborsList, gamesData) {
  const mount = d3.select("#other-graph");
  mount.html("");
  const width = 600;
  const height = 400;

  const baseInfo = gamesData[baseGame] || {};
  const neighborMechanics = neighborsList.reduce((acc, n) => {
    const arr = gamesData[n.name]?.mechanics;
    if (Array.isArray(arr)) acc.push(...arr);
    return acc;
  }, []);

  if (!neighborMechanics.length) {
    mount.append("p").text("No mechanics data available for current matches.");
    return;
  }

  const mechanicsCount = d3.rollup(neighborMechanics, v => v.length, d => d);
  const data = Array.from(mechanicsCount, ([mechanic, count]) => ({ mechanic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const svgEl = mount.append("svg")
    .attr("width", width)
    .attr("height", height + 120)
    .style("display", "block")
    .style("margin", "0 auto");

  const x = d3.scaleBand()
    .domain(data.map(d => d.mechanic))
    .range([60, width - 20])
    .padding(0.2);

  const yMax = d3.max(data, d => d.count) || 1;
  const y = d3.scaleLinear()
    .domain([0, yMax])
    .range([height - 50, 40]);
  svgEl.selectAll("rect.bar")
    .data(data)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d.mechanic))
    .attr("y", d => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", d => (height - 50) - y(d.count))
    .attr("fill", d => (baseInfo.mechanics||[]).includes(d.mechanic) ? "#FF9800" : "#2196F3")
    .on("click", (event, d) => {
      const sharedMechanics = (baseInfo.mechanics || []).filter(m => m === d.mechanic);
      const baseThemes = baseInfo.categories || [];
      const neighborThemesForMechanic = new Set(
        neighborsList.flatMap(n => {
          const g = gamesData[n.name] || {};
          const mechs = Array.isArray(g.mechanics) ? g.mechanics : [];
          const cats = Array.isArray(g.categories) ? g.categories : [];
          return mechs.includes(d.mechanic) ? cats : [];
        })
      );
      const sharedThemes = baseThemes.filter(c => neighborThemesForMechanic.has(c));

      alert(
        `Shared mechanics: ${sharedMechanics.join(", ") || "None"}\n` +
        `Shared themes (among matches using "${d.mechanic}"): ${sharedThemes.join(", ") || "None"}`
      );
    });
  svgEl.append("g")
    .attr("transform", `translate(0,${height - 50})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");
  svgEl.append("g")
    .attr("transform", "translate(60,0)")
    .call(d3.axisLeft(y).ticks(yMax).tickFormat(d3.format("d")));
  svgEl.append("text")
    .attr("x", width / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Top 15 Mechanics by Frequency");
  svgEl.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Mechanics");
  svgEl.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(height - 50) / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Number of Games");
}
function renderCategoriesPieChart(baseGame, neighborsList, gamesData) {
  const mount = d3.select("#other-graph");
  mount.html("");
  const width = 600;
  const height = 400;
  const radius = Math.min(width, height) / 2 - 40;
  const baseInfo = gamesData[baseGame] || {};
  const categoriesCount = neighborsList.reduce((acc, n) => {
    const arr = gamesData[n.name]?.categories;
    if (Array.isArray(arr)) {
      arr.forEach(c => acc.set(c, (acc.get(c) || 0) + 1));
    }
    return acc;
  }, new Map());

  const data = Array.from(categoriesCount, ([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  if (!data.length) {
    mount.append("p").text("No category data available for current matches.");
    return;
  }

  const total = d3.sum(data, d => d.count);
  const color = d3.scaleOrdinal(d3.schemeCategory10);
  const pie = d3.pie().value(d => d.count);
  const arc = d3.arc().innerRadius(0).outerRadius(radius);

  const svgEl = mount.append("svg")
    .attr("width", width)
    .attr("height", height + 80)
    .style("display", "block")
    .style("margin", "0 auto");

  const chartGroup = svgEl.append("g")
    .attr("transform", `translate(${width/2 - 100},${height/2})`);
  chartGroup.selectAll("path")
    .data(pie(data))
    .enter().append("path")
    .attr("d", arc)
    .attr("fill", d => color(d.data.category))
    .on("click", (event, d) => {
      const baseCategories = baseInfo.categories || [];
      const sharedCategories = baseCategories.filter(c => c === d.data.category);

      alert(
        `Category: ${d.data.category}\n` +
        `Neighbor games count: ${d.data.count}\n` +
        `Shared with base game: ${sharedCategories.join(", ") || "None"}`
      );
    });
  chartGroup.selectAll("text")
    .data(pie(data))
    .enter().append("text")
    .attr("transform", d => `translate(${arc.centroid(d)})`)
    .attr("dy", "0.35em")
    .text(d => `${((d.data.count/total)*100).toFixed(1)}%`)
    .style("font-size", "12px")
    .style("text-anchor", "middle");
  svgEl.append("text")
    .attr("x", width / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Top 6 Categories by Frequency");
  const legend = svgEl.append("g")
    .attr("transform", `translate(${width - 180}, 60)`);

  data.forEach((d, i) => {
    legend.append("rect")
      .attr("x", 0).attr("y", i * 25)
      .attr("width", 14).attr("height", 14)
      .attr("fill", color(d.category));
    legend.append("text")
      .attr("x", 20).attr("y", i * 25 + 12)
      .text(`${d.category} (${((d.count/total)*100).toFixed(1)}%)`)
      .attr("font-size", "13px");
  });
}
function renderPublicationTrend(baseGame, neighborsList, gamesData) {
  const mount = d3.select("#other-graph");
  mount.html("");
  const width = 700;
  const height = 400;
  const baseInfo = gamesData?.[baseGame] || {};
  const years = neighborsList.reduce((acc, n) => {
    const info = gamesData?.[n.name];
    const y = info?.year || info?.yearPublished;
    if (y) acc.push(+y);
    return acc;
  }, []);

  if (!years.length) {
    mount.append("p").text("No publication data available for current matches.");
    return;
  }
  const yearCount = d3.rollup(years, v => v.length, d => d);
  const data = Array.from(yearCount, ([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);

  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.year))
    .range([60, width - 20]);

  const yMax = d3.max(data, d => d.count) || 1;
  const y = d3.scaleLinear()
    .domain([0, yMax])
    .range([height - 50, 40]);

  const svgEl = mount.append("svg")
    .attr("width", width)
    .attr("height", height + 60)
    .style("display", "block")
    .style("margin", "0 auto");

  svgEl.append("g")
    .attr("transform", `translate(0,${height - 50})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  svgEl.append("g")
    .attr("transform", "translate(60,0)")
    .call(d3.axisLeft(y).ticks(yMax).tickFormat(d3.format("d")));

  svgEl.selectAll("circle")
    .data(data)
    .enter().append("circle")
    .attr("cx", d => x(d.year))
    .attr("cy", d => y(d.count))
    .attr("r", 5)
    .attr("fill", "#FF5722")
    .on("click", (event, d) => {
      const baseYear = baseInfo.year || baseInfo.yearPublished;
      const comparison = baseYear
        ? `Base game published in ${baseYear}.`
        : "Base game publication year unknown.";

      alert(
        `Year: ${d.year}\n` +
        `Neighbor games published: ${d.count}\n\n` +
        comparison
      );
    });


  svgEl.append("text")
    .attr("x", width / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Games Published per Year");

  svgEl.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Year");

  svgEl.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(height - 50) / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Number of Games");
}

window.renderGraph = renderGraph
window.renderRatingDensity = renderRatingDensity
window.renderMechanicsBarChart = renderMechanicsBarChart
window.renderCategoriesPieChart = renderCategoriesPieChart
window.renderPublicationTrend = renderPublicationTrend