const CS2_APP_ID = 730;

async function fetchCs2Stats(steamId) {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) return null;

  const url = `https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v2/?appid=${CS2_APP_ID}&key=${apiKey}&steamid=${steamId}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const stats = data?.playerstats?.stats;
  if (!stats) return null;

  const find = (name) => stats.find((s) => s.name === name)?.value ?? 0;

  return {
    kills: find("total_kills"),
    deaths: find("total_deaths"),
    wins: find("total_wins"),
    mvps: find("total_mvps"),
    headshots: find("total_kills_headshot")
  };
}

async function fetchSteamProfile(steamId) {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) return null;

  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  return data?.response?.players?.[0] ?? null;
}

module.exports = { fetchCs2Stats, fetchSteamProfile };
