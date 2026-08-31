async function fetchReactionGif(action) {
  const res = await fetch(`https://nekos.best/api/v2/${action}`, {
    headers: { "User-Agent": "cs2-matchmaking-bot/1.0 (+https://github.com/ceitooo/cs2-matchmaking-bot)" }
  });
  if (!res.ok) throw new Error(`nekos.best respondió ${res.status}`);
  const data = await res.json();
  const result = data.results?.[0];
  if (!result) throw new Error("nekos.best no devolvió resultados");
  return result;
}

module.exports = { fetchReactionGif };
