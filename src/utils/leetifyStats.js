// API interna de Leetify (pública, sin autenticación). No está documentada oficialmente,
// así que todo acá falla en silencio: si cambia o se cae, devolvemos null y el comando
// simplemente muestra el link al perfil en vez de los números.
const BASE = "https://api.cs-prod.leetify.com/api";
const TIMEOUT_MS = 6000;

async function getJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function num(value, digits = 1) {
  return typeof value === "number" && Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

async function fetchLeetifyStats(steamId64) {
  const data = await getJson(`${BASE}/profile/${steamId64}/recent-games/5v5`);
  if (!data || typeof data !== "object") return null;

  return {
    matchesPlayed: num(data.matchesPlayed, 0),
    aimRating: num(data.aimRating),
    utilityRating: num(data.utilityRating),
    leetifyRating: num(data.leetifyRating, 4),
    kdRatio: num(data.kdRatio, 2),
    winRate: num(typeof data.winRate === "number" ? data.winRate * 100 : null),
    kast: num(typeof data.kast === "number" ? data.kast * 100 : null),
    headshotPercentage: num(data.headshotKillPercentage),
    reactionTimeMs: num(data.reactionTime, 0),
    accuracy: num(data.accuracy),
    sprayAccuracy: num(data.sprayAccuracy),
    preaim: num(data.preaim, 2),
    counterStrafing: num(data.counterStrafingShotsGoodRatio),
    premierRating: typeof data.benchmark?.skillLevel === "number" ? data.benchmark.skillLevel : null
  };
}

module.exports = { fetchLeetifyStats };
