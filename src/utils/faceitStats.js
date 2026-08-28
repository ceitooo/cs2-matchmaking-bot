async function fetchFaceitStats(steamId64) {
  const apiKey = process.env.FACEIT_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(`https://open.faceit.com/data/v4/players?game=cs2&game_player_id=${steamId64}`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });

  if (!res.ok) return null;

  const data = await res.json();
  const cs2 = data?.games?.cs2;
  if (!cs2) return null;

  return {
    nickname: data.nickname,
    faceitUrl: data.faceit_url?.replace("{lang}", "en"),
    level: cs2.skill_level,
    elo: cs2.faceit_elo,
    region: cs2.region
  };
}

module.exports = { fetchFaceitStats };
