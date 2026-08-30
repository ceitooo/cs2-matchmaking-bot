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

async function fetchSteamProfiles(steamIds) {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey || steamIds.length === 0) return [];

  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamIds.join(",")}`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  return data?.response?.players ?? [];
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

async function fetchCs2PlaytimeMinutes(steamId) {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) return null;

  const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&appids_filter[0]=${CS2_APP_ID}&include_appinfo=false`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const game = data?.response?.games?.find((g) => g.appid === CS2_APP_ID);
  return game ? game.playtime_forever : null; // null si el perfil no comparte esta info
}

const SMURF_MIN_ACCOUNT_AGE_DAYS = 30;
const SMURF_MIN_CS2_HOURS = 50;

function evaluateSmurfRisk(profile, playtimeMinutes) {
  const flags = [];

  if (profile?.timecreated) {
    const ageDays = Math.floor((Date.now() / 1000 - profile.timecreated) / 86400);
    if (ageDays < SMURF_MIN_ACCOUNT_AGE_DAYS) flags.push(`cuenta de Steam creada hace solo ${ageDays} días`);
  }

  if (typeof playtimeMinutes === "number") {
    const hours = Math.round(playtimeMinutes / 60);
    if (hours < SMURF_MIN_CS2_HOURS) flags.push(`solo ${hours}h jugadas en CS2`);
  }

  return flags;
}

module.exports = { fetchCs2Stats, fetchSteamProfile, fetchSteamProfiles, fetchCs2PlaytimeMinutes, evaluateSmurfRisk };
