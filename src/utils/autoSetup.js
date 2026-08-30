const { ChannelType, PermissionFlagsBits } = require("discord.js");
const { getGuildSettings, updateGuildSettings } = require("./database");

const LOG_CHANNELS = [
  { key: "log_server_channel_id", name: "📜┃server-logs" },
  { key: "log_bans_channel_id", name: "🔨┃ban-logs" },
  { key: "log_warns_channel_id", name: "⚠️┃warn-logs" },
  { key: "log_nicknames_channel_id", name: "✏️┃nickname-logs" },
  { key: "log_messages_channel_id", name: "🗑️┃mensajes-logs" },
  { key: "log_verifications_channel_id", name: "✅┃verificaciones-logs" }
];

async function channelStillExists(guild, channelId) {
  if (!channelId) return false;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  return Boolean(channel);
}

async function ensureLogsSetup(guild, settings) {
  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) return;

  let categoryId = settings.logs_category_id;
  if (!(await channelStillExists(guild, categoryId))) {
    const category = await guild.channels
      .create({
        name: "📋┃Logs",
        type: ChannelType.GuildCategory,
        permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }]
      })
      .catch(() => null);
    if (!category) return;
    categoryId = category.id;
    updateGuildSettings(guild.id, { logs_category_id: categoryId });
  }

  const fields = {};
  for (const logChannel of LOG_CHANNELS) {
    const currentId = settings[logChannel.key];
    if (await channelStillExists(guild, currentId)) continue;

    const channel = await guild.channels
      .create({ name: logChannel.name, type: ChannelType.GuildText, parent: categoryId })
      .catch(() => null);
    if (channel) fields[logChannel.key] = channel.id;
  }

  if (Object.keys(fields).length > 0) updateGuildSettings(guild.id, fields);
}

async function ensureInvitesSetup(guild, settings) {
  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageChannels) || !me?.permissions.has(PermissionFlagsBits.ManageGuild)) return;

  let categoryId = settings.invites_category_id;
  if (!(await channelStillExists(guild, categoryId))) {
    const category = await guild.channels.create({ name: "📨┃Invitaciones", type: ChannelType.GuildCategory }).catch(() => null);
    if (!category) return;
    categoryId = category.id;
    updateGuildSettings(guild.id, { invites_category_id: categoryId });
  }

  if (!(await channelStillExists(guild, settings.invites_channel_id))) {
    const channel = await guild.channels
      .create({ name: "📨┃invitaciones", type: ChannelType.GuildText, parent: categoryId })
      .catch(() => null);
    if (channel) updateGuildSettings(guild.id, { invites_channel_id: channel.id });
  }
}

async function runAutoSetup(client) {
  for (const guild of client.guilds.cache.values()) {
    const settings = getGuildSettings(guild.id);
    await ensureLogsSetup(guild, settings).catch((e) => console.error(`[auto-setup] logs en ${guild.name}:`, e.message));

    const refreshed = getGuildSettings(guild.id);
    await ensureInvitesSetup(guild, refreshed).catch((e) => console.error(`[auto-setup] invites en ${guild.name}:`, e.message));
  }
}

module.exports = { runAutoSetup };
