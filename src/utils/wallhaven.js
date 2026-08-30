// Categorías de Wallhaven: bits General-Anime-People, ej "110" = general+anime
const CATEGORY_BITS = {
  mixed: "110",
  anime: "010",
  general: "100"
};

async function fetchWallpaper({ ratio, category = "mixed", minRes }) {
  const params = new URLSearchParams({
    categories: CATEGORY_BITS[category] ?? CATEGORY_BITS.mixed,
    purity: "100", // solo SFW
    sorting: "random",
    per_page: "24"
  });
  if (ratio) params.set("ratios", ratio);
  if (minRes) params.set("atleast", minRes);

  const res = await fetch(`https://wallhaven.cc/api/v1/search?${params.toString()}`);
  if (!res.ok) throw new Error(`Wallhaven respondió ${res.status}`);

  const json = await res.json();
  const items = json.data ?? [];
  if (items.length === 0) return null;

  const pick = items[Math.floor(Math.random() * items.length)];
  return {
    imageUrl: pick.path,
    pageUrl: pick.url,
    resolution: pick.resolution
  };
}

module.exports = { fetchWallpaper };
