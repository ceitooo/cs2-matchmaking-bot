const { ChannelType, PermissionFlagsBits } = require("discord.js");
const { db } = require("../db/database");

const REMINDER_AFTER_MS = 15 * 60 * 1000; // 15 min sin que todos estén listos
const AUTO_FINALIZE_AFTER_MS = 30 * 60 * 1000; // 30 min sin que todos estén listos

const lobbyTimers = new Map(); // lobbyId -> { reminder: Timeout, autoFinalize: Timeout }

function clearLobbyTimers(lobbyId) {
  const timers = lobbyTimers.get(lobbyId);
  if (timers) {
    clearTimeout(timers.reminder);
    clearTimeout(timers.autoFinalize);
    lobbyTimers.delete(lobbyId);
  }
}

function scheduleLobbyTimers(guild, lobbyId, buildLobbyPanel) {
  clearLobbyTimers(lobbyId);

  const reminder = setTimeout(async () => {
    const lobby = db.prepare("SELECT * FROM lobbies WHERE id = ?").get(lobbyId);
    if (!lobby || lobby.status === "finished") return;

    const channel = await guild.channels.fetch(lobby.channel_id).catch(() => null);
    if (channel && lobby.message_id) {
      await channel
        .send(`⏰ Han pasado 15 minutos y la sala **#${lobbyId}** sigue sin estar completa. Si no marcan Listo pronto, se cerrará sola en 15 minutos más.`)
        .catch(() => {});
    }
  }, REMINDER_AFTER_MS);

  const autoFinalize = setTimeout(async () => {
    const lobby = db.prepare("SELECT * FROM lobbies WHERE id = ?").get(lobbyId);
    if (!lobby || lobby.status === "finished") return;

    await finalizeLobby(guild, lobbyId);

    const channel = await guild.channels.fetch(lobby.channel_id).catch(() => null);
    if (channel && lobby.message_id) {
      const message = await channel.messages.fetch(lobby.message_id).catch(() => null);
      if (message) await message.edit(buildLobbyPanel(lobbyId)).catch(() => {});
      await channel.send(`🕒 La sala **#${lobbyId}** se cerró automáticamente por inactividad.`).catch(() => {});
    }
  }, AUTO_FINALIZE_AFTER_MS);

  lobbyTimers.set(lobbyId, { reminder, autoFinalize });
}

async function deleteIfExists(guild, channelId) {
  if (!channelId) return;
  const channel = guild.channels.cache.get(channelId) ?? (await guild.channels.fetch(channelId).catch(() => null));
  if (channel) await channel.delete().catch(() => {});
}

async function checkAllReadyAndSyncChannels(guild, lobbyId) {
  const lobby = db.prepare("SELECT * FROM lobbies WHERE id = ?").get(lobbyId);
  if (!lobby || lobby.status === "finished") return;

  const players = db.prepare("SELECT * FROM lobby_players WHERE lobby_id = ?").all(lobbyId);
  const teamA = players.filter((p) => p.team === "A");
  const teamB = players.filter((p) => p.team === "B");

  if (players.length < 2 || teamA.length === 0 || teamB.length === 0) return;
  if (!players.every((p) => p.ready)) return;

  clearLobbyTimers(lobbyId);

  // Recrear los canales (soporta repetir varias veces con las mismas partidas)
  await deleteIfExists(guild, lobby.team_a_channel);
  await deleteIfExists(guild, lobby.team_b_channel);
  await deleteIfExists(guild, lobby.category_id);

  const category = await guild.channels.create({
    name: `🎮 Sala #${lobbyId}`,
    type: ChannelType.GuildCategory
  });

  const voiceA = await guild.channels.create({
    name: `🔫 ${lobby.team_a_name}`,
    type: ChannelType.GuildVoice,
    parent: category.id,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect] },
      ...teamA.map((p) => ({
        id: p.user_id,
        allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.UseVAD]
      }))
    ]
  });

  const voiceB = await guild.channels.create({
    name: `🔫 ${lobby.team_b_name}`,
    type: ChannelType.GuildVoice,
    parent: category.id,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect] },
      ...teamB.map((p) => ({
        id: p.user_id,
        allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.UseVAD]
      }))
    ]
  });

  db.prepare("UPDATE lobbies SET category_id = ?, team_a_channel = ?, team_b_channel = ? WHERE id = ?").run(
    category.id,
    voiceA.id,
    voiceB.id,
    lobbyId
  );

  for (const p of teamA) {
    const member = await guild.members.fetch(p.user_id).catch(() => null);
    if (member?.voice?.channelId) await member.voice.setChannel(voiceA.id).catch(() => {});
  }
  for (const p of teamB) {
    const member = await guild.members.fetch(p.user_id).catch(() => null);
    if (member?.voice?.channelId) await member.voice.setChannel(voiceB.id).catch(() => {});
  }
}

async function finalizeLobby(guild, lobbyId) {
  const lobby = db.prepare("SELECT * FROM lobbies WHERE id = ?").get(lobbyId);
  if (!lobby) return;

  clearLobbyTimers(lobbyId);

  const players = db.prepare("SELECT user_id FROM lobby_players WHERE lobby_id = ?").all(lobbyId);
  for (const p of players) {
    db.prepare("UPDATE players SET lobbies_played = lobbies_played + 1 WHERE user_id = ?").run(p.user_id);
  }

  await deleteIfExists(guild, lobby.team_a_channel);
  await deleteIfExists(guild, lobby.team_b_channel);
  await deleteIfExists(guild, lobby.category_id);

  db.prepare("DELETE FROM lobby_players WHERE lobby_id = ?").run(lobbyId);
  db.prepare("UPDATE lobbies SET status = 'finished' WHERE id = ?").run(lobbyId);
}

module.exports = { checkAllReadyAndSyncChannels, finalizeLobby, scheduleLobbyTimers, clearLobbyTimers };
