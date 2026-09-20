const { PermissionFlagsBits } = require("discord.js");
const { saveLockout, getLockout, listLockouts, deleteLockout } = require("../db/database");

const CHECK_INTERVAL_MS = 15 * 1000;
const CHUNK_SIZE = 8;

function lockableChannels(guild) {
  return guild.channels.cache.filter((c) => !c.isThread() && c.type !== 4 && c.permissionOverwrites);
}

async function inChunks(items, fn) {
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    await Promise.all(items.slice(i, i + CHUNK_SIZE).map((item) => fn(item).catch(() => {})));
  }
}

// Oculta todos los canales al miembro con overrides propios (los de miembro
// pisan a los de rol), guardando el valor previo de ViewChannel para restaurarlo.
async function lockoutMember(guild, member, durationMs) {
  const existing = getLockout(guild.id, member.id);
  const previous = existing ? JSON.parse(existing.previous_json) : {};
  const channels = [...lockableChannels(guild).values()];

  for (const channel of channels) {
    if (previous[channel.id] !== undefined) continue;
    const overwrite = channel.permissionOverwrites.cache.get(member.id);
    if (overwrite?.deny.has(PermissionFlagsBits.ViewChannel)) previous[channel.id] = false;
    else if (overwrite?.allow.has(PermissionFlagsBits.ViewChannel)) previous[channel.id] = true;
    else previous[channel.id] = null;
  }

  saveLockout(guild.id, member.id, Date.now() + durationMs, previous);
  await inChunks(channels, (channel) => channel.permissionOverwrites.edit(member.id, { ViewChannel: false }, { reason: "Castigo: reenvió un mensaje" }));
}

async function restoreMember(guild, userId) {
  const lockout = getLockout(guild.id, userId);
  if (!lockout) return;

  const previous = JSON.parse(lockout.previous_json);
  const entries = Object.entries(previous).map(([channelId, value]) => ({ channel: guild.channels.cache.get(channelId), value }));
  await inChunks(
    entries.filter((e) => e.channel?.permissionOverwrites),
    ({ channel, value }) => channel.permissionOverwrites.edit(userId, { ViewChannel: value }, { reason: "Fin del castigo" })
  );

  deleteLockout(guild.id, userId);
}

async function processExpired(client) {
  const now = Date.now();
  for (const lockout of listLockouts()) {
    if (lockout.expires_at > now) continue;
    const guild = client.guilds.cache.get(lockout.guild_id);
    if (!guild) continue;
    await restoreMember(guild, lockout.user_id).catch((e) => console.error("[lockout] Error restaurando:", e.message));
  }
}

function startLockoutChecker(client) {
  processExpired(client);
  setInterval(() => processExpired(client), CHECK_INTERVAL_MS);
}

module.exports = { lockoutMember, restoreMember, startLockoutChecker };
