const { PermissionFlagsBits } = require("discord.js");

const WINDOW_MS = 10_000;
const THRESHOLD = 4;
const actionsByExecutor = new Map(); // "guildId:executorId" -> timestamps[]

function registerAction(guildId, executorId) {
  const key = `${guildId}:${executorId}`;
  const now = Date.now();
  const timestamps = (actionsByExecutor.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  actionsByExecutor.set(key, timestamps);
  return timestamps.length >= THRESHOLD;
}

async function lockdownExecutor(guild, executorId) {
  if (executorId === guild.ownerId || executorId === guild.client.user.id) return null;

  const member = await guild.members.fetch(executorId).catch(() => null);
  if (!member || !member.manageable) return null;

  const dangerousRoles = member.roles.cache.filter(
    (r) => r.permissions.has(PermissionFlagsBits.Administrator) || r.permissions.has(PermissionFlagsBits.BanMembers) || r.permissions.has(PermissionFlagsBits.KickMembers)
  );

  for (const role of dangerousRoles.values()) {
    await member.roles.remove(role).catch(() => {});
  }

  return { member, removedRoles: [...dangerousRoles.values()] };
}

async function checkAntiNuke(guild, executorId, actionLabel) {
  if (!executorId) return;
  const triggered = registerAction(guild.id, executorId);
  if (!triggered) return;

  const result = await lockdownExecutor(guild, executorId);
  if (!result) return;

  const settings = require("../db/database").getGuildSettings(guild.id);
  const channelId = settings.antiraid_log_channel_id || settings.log_bans_channel_id;
  if (!channelId) return;

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  await channel
    .send(
      `🚨 **Anti-nuke activado**\n${result.member.user.tag} (${executorId}) hizo demasiadas acciones de **${actionLabel}** en poco tiempo.\nRoles removidos: ${
        result.removedRoles.map((r) => r.name).join(", ") || "ninguno (no tenía roles peligrosos removibles)"
      }`
    )
    .catch(() => {});
}

module.exports = { checkAntiNuke };
