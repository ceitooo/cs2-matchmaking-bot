const { db, getGuildSettings } = require("../db/database");
const { fetchSteamProfiles } = require("./steamStats");

const CS2_APP_ID = "730";
const POLL_INTERVAL_MS = 30 * 1000;
const MAX_POLLS = 30; // ~15 minutos

const activeWatchers = new Set();

/**
 * Empieza a chequear cada 30s si alguno de los jugadores con Steam vinculado de la sala
 * ya está jugando CS2 (vía Steam Web API). Cuando lo detecta, avisa en el canal configurado
 * y deja de chequear esa sala.
 */
function startMatchWatch(guild, lobbyId) {
  if (activeWatchers.has(lobbyId)) return;
  activeWatchers.add(lobbyId);

  let polls = 0;

  const interval = setInterval(async () => {
    polls++;

    const lobby = db.prepare("SELECT * FROM lobbies WHERE id = ?").get(lobbyId);
    if (!lobby || lobby.status === "finished" || lobby.match_started_notified) {
      clearInterval(interval);
      activeWatchers.delete(lobbyId);
      return;
    }

    if (polls > MAX_POLLS) {
      clearInterval(interval);
      activeWatchers.delete(lobbyId);
      return;
    }

    try {
      const players = db
        .prepare(
          `SELECT players.steam_id, players.username FROM lobby_players
           JOIN players ON players.user_id = lobby_players.user_id
           WHERE lobby_players.lobby_id = ? AND players.steam_id IS NOT NULL`
        )
        .all(lobbyId);

      if (players.length === 0) return;

      const profiles = await fetchSteamProfiles(players.map((p) => p.steam_id));
      const playingNow = profiles.filter((p) => p.gameid === CS2_APP_ID);

      if (playingNow.length === 0) return;

      clearInterval(interval);
      activeWatchers.delete(lobbyId);
      db.prepare("UPDATE lobbies SET match_started_notified = 1 WHERE id = ?").run(lobbyId);

      const settings = getGuildSettings(guild.id);
      const channelId = settings.match_alerts_channel_id || lobby.channel_id;
      const channel = await guild.channels.fetch(channelId).catch(() => null);
      if (!channel?.isTextBased()) return;

      const names = playingNow.map((p) => p.personaname).join(", ");
      await channel
        .send(`🎮 **¡La partida de la sala #${lobbyId} ya comenzó!** Detectado en Steam: ${names}`)
        .catch(() => {});
    } catch (error) {
      console.error(`[match-detector] Error revisando sala #${lobbyId}:`, error.message);
    }
  }, POLL_INTERVAL_MS);
}

function stopMatchWatch(lobbyId) {
  activeWatchers.delete(lobbyId);
}

module.exports = { startMatchWatch, stopMatchWatch };
