document.addEventListener("DOMContentLoaded", () => {
  const aboutContent = document.getElementById("about-content");
  if (aboutContent) {
    aboutContent.innerHTML = `
      <p><b>Boardgame Similarity Explorer</b> is an interactive tool designed to help you discover, filter, and compare board games based on their attributes and relationships.</p>

      <h3>How to use the page</h3>
      <ul>
        <li><b>Search bar:</b> Type the name of a game (e.g., "Catan") and press <i>Search</i> to load its information and similar games.</li>
        <li><b>Filters:</b> Use the ⚙️ Filters button to refine your search by rating, number of players, playtime, artist, publisher, designer, themes, or mechanics. You can also exclude expansions or reimplementations.</li>
        <li><b>Results tab:</b> Displays the base game card, the similarity graph, and a list of neighbor games that match your filters.</li>
        <li><b>Clusters tab:</b> Groups games by <i>categories</i> or <i>mechanics</i> so you can see clusters of similar titles.</li>
        <li><b>Other Charts tab:</b> Provides multiple visualizations:
          <ul>
            <li><b>Ratings:</b> Density plots comparing global ratings vs. local neighbors.</li>
            <li><b>Mechanics:</b> Bar charts showing the most common mechanics globally and locally.</li>
            <li><b>Categories:</b> Pie charts showing distribution of categories.</li>
            <li><b>Publications:</b> Trends of games published per year (global vs. base + neighbors).</li>
            <li><b>Word Cloud:</b> Highlights frequent mechanics, categories, or description words among similar games.</li>
          </ul>
        </li>
        <li><b>Comparison tab:</b> Displays a detailed comparison between two selected games, including ratings, players, playtime, shared and unique mechanics/themes, and shared creators (designer, publisher, artist).</li>
        <li><b>About tab:</b> This guide, explaining how to navigate and use the explorer.</li>
      </ul>

      <h3>Key Concepts</h3>
      <ul>
        <li><b>Mechanics:</b> These are the rules or systems that define how a game is played. Examples include <i>deck-building</i>, <i>worker placement</i>, <i>dice rolling</i>, or <i>trading</i>. Mechanics describe the actions players can take and the structure of gameplay.</li>
        <li><b>Themes:</b> These are the narrative or setting elements that give a game its flavor. Examples include <i>fantasy</i>, <i>science fiction</i>, <i>economic simulation</i>, or <i>historical warfare</i>. Themes provide context and atmosphere but do not dictate the rules.</li>
        <li><b>Score (Similarity):</b> The similarity score between two games is calculated based on shared attributes such as mechanics, themes, designers, publishers, and ratings. The more overlap in these features, the higher the score. This score is used to draw links in the similarity graph and to rank neighbor games.</li>
      </ul>

      <h3>Tips</h3>
      <ul>
        <li>Click on a link in the similarity graph to select two games for comparison.</li>
        <li>Adjust the sliders (rating, players, playtime) to quickly narrow down the type of game you want.</li>
        <li>Use the <i>Word Cloud</i> to discover common themes or mechanics among similar games.</li>
        <li>Switch between tabs to explore different perspectives: results, clusters, charts, and comparisons.</li>
      </ul>
    `;
  }
});