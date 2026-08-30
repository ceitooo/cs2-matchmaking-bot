const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

async function searchDanbooru(tags, limit = 100) {
  const url = `https://danbooru.donmai.us/posts.json?tags=${encodeURIComponent(tags)}&limit=${limit}`;
  const res = await fetch(url, { headers: { "User-Agent": "CeitusBot/1.0 (Discord bot)" } });
  if (!res.ok) throw new Error(`Danbooru respondió ${res.status}`);
  return res.json();
}

/**
 * @param {string} tag - un único tag de Danbooru (las búsquedas anónimas permiten máx. 2 tags,
 *   y uno ya lo ocupa "rating:general")
 * @param {"landscape"|"portrait"|"square"|null} orientation
 */
async function fetchDanbooruImage(tag, orientation = null) {
  const posts = await searchDanbooru(`rating:general ${tag}`, 100);

  let candidates = posts.filter((p) => {
    const url = p.large_file_url || p.file_url;
    if (!url) return false;
    const ext = (p.file_ext || "").toLowerCase();
    if (!IMAGE_EXTS.has(ext)) return false;
    return true;
  });

  if (orientation && candidates.length > 5) {
    candidates = candidates.filter((p) => {
      const ratio = p.image_width / p.image_height;
      if (orientation === "landscape") return ratio >= 1.2;
      if (orientation === "portrait") return ratio <= 0.85;
      if (orientation === "square") return ratio > 0.85 && ratio < 1.2;
      return true;
    });
  }

  if (candidates.length === 0) return null;

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return {
    imageUrl: pick.large_file_url || pick.file_url,
    pageUrl: `https://danbooru.donmai.us/posts/${pick.id}`,
    resolution: `${pick.image_width}x${pick.image_height}`
  };
}

module.exports = { fetchDanbooruImage };
