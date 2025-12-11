
function explainMatch(baseGame, neighborName, gamesData) {
  const neighborInfo = gamesData[neighborName];
  const baseInfo = gamesData[baseGame];
  let reasons = [];

  if (baseInfo && neighborInfo) {
    if (baseInfo.minPlayers <= neighborInfo.maxPlayers &&
        neighborInfo.minPlayers <= baseInfo.maxPlayers) {
      reasons.push("👥 Compatible player counts");
    }
    if (Math.abs(baseInfo.playtime - neighborInfo.playtime) <= 30) {
      reasons.push("⏱️ Similar playtime");
    }
    if (baseInfo.age === neighborInfo.age) {
      reasons.push("🎂 Same minimum age");
    }
    const commonMechanics = (baseInfo.mechanics || []).filter(m => (neighborInfo.mechanics || []).includes(m));
    if (commonMechanics.length > 0) {
      reasons.push("🎲 Shared mechanics: " + commonMechanics.join(", "));
    }
    const commonCategories = (baseInfo.categories || []).filter(c => (neighborInfo.categories || []).includes(c));
    if (commonCategories.length > 0) {
      reasons.push("🎨 Shared themes: " + commonCategories.join(", "));
    }
    const commonRanks = (baseInfo.rankCategories || []).filter(r => (neighborInfo.rankCategories || []).includes(r));
    if (commonRanks.length > 0) {
      reasons.push("⭐ Both appear in rankings: " + commonRanks.join(", "));
    }
  }
  return reasons;
}

function getMechanicFilters() {
  const ids = ["mechanicInput1", "mechanicInput2", "mechanicInput3", "mechanicInput"];
  const values = [];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.value) values.push(el.value);
  });
  return values;
}






window.getMechanicFilters = getMechanicFilters;
window.explainMatch = explainMatch;