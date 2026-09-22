let cache = { ars: null, uyu: null, ts: 0 };
const TTL = 10 * 60 * 1000; // 10 min

async function getRates() {
  if (Date.now() - cache.ts < TTL && cache.ars) return cache;

  try {
    // Cotización dólar blue/cripto ARS
    const resArs = await fetch("https://dolarito.ar/api/frontend/history/cripto", {
      headers: { Referer: "https://dolarito.ar/" }
    });
    const dataArs = await resArs.json();
    const ars = dataArs?.sell ?? dataArs?.price ?? null;

    // Cotización USD → UYU via exchangerate
    const resUyu = await fetch("https://open.er-api.com/v6/latest/USD");
    const dataUyu = await resUyu.json();
    const uyu = dataUyu?.rates?.UYU ?? null;

    if (ars) {
      cache = { ars: parseFloat(ars), uyu: uyu ? parseFloat(uyu) : 43, ts: Date.now() };
    }
  } catch {
    // Fallback si falla la API
    if (!cache.ars) cache = { ars: 1535, uyu: 43, ts: Date.now() };
  }

  return cache;
}

function toArs(usd, arsRate) {
  return Math.round(usd * arsRate);
}

function toUyu(usd, uyuRate) {
  return Math.round(usd * uyuRate);
}

module.exports = { getRates, toArs, toUyu };
