const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { getGuildSettings, updateGuildSettings } = require("../db/database");
const { CEITO_ROLE_ID, DEVELOPER_ROLE_ID } = require("./permissions");

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

// Busca por nombre dentro del server (por si ya fueron creados a mano o vía script,
// sin pasar por la base de datos del bot) antes de crear uno nuevo.
function findByName(guild, name, type) {
  return guild.channels.cache.find((c) => c.name === name && c.type === type) ?? null;
}

async function ensureLogsSetup(guild, settings) {
  const me = guild.members.me;

  let categoryId = settings.logs_category_id;
  if (!(await channelStillExists(guild, categoryId))) {
    const existing = findByName(guild, "📋┃Logs", ChannelType.GuildCategory);
    if (existing) {
      categoryId = existing.id;
      updateGuildSettings(guild.id, { logs_category_id: categoryId });
    } else if (me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
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
    } else {
      return;
    }
  }

  const fields = {};
  for (const logChannel of LOG_CHANNELS) {
    const currentId = settings[logChannel.key];
    if (await channelStillExists(guild, currentId)) continue;

    const existing = findByName(guild, logChannel.name, ChannelType.GuildText);
    if (existing) {
      fields[logChannel.key] = existing.id;
      continue;
    }

    if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) continue;
    const channel = await guild.channels
      .create({ name: logChannel.name, type: ChannelType.GuildText, parent: categoryId })
      .catch(() => null);
    if (channel) fields[logChannel.key] = channel.id;
  }

  if (Object.keys(fields).length > 0) updateGuildSettings(guild.id, fields);
}

async function ensureInvitesSetup(guild, settings) {
  const me = guild.members.me;

  let categoryId = settings.invites_category_id;
  if (!(await channelStillExists(guild, categoryId))) {
    const existing = findByName(guild, "📨┃Invitaciones", ChannelType.GuildCategory);
    if (existing) {
      categoryId = existing.id;
      updateGuildSettings(guild.id, { invites_category_id: categoryId });
    } else if (me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      const category = await guild.channels.create({ name: "📨┃Invitaciones", type: ChannelType.GuildCategory }).catch(() => null);
      if (!category) return;
      categoryId = category.id;
      updateGuildSettings(guild.id, { invites_category_id: categoryId });
    } else {
      return;
    }
  }

  if (!(await channelStillExists(guild, settings.invites_channel_id))) {
    const existing = findByName(guild, "📨┃invitaciones", ChannelType.GuildText);
    if (existing) {
      updateGuildSettings(guild.id, { invites_channel_id: existing.id });
    } else if (me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      const channel = await guild.channels
        .create({ name: "📨┃invitaciones", type: ChannelType.GuildText, parent: categoryId })
        .catch(() => null);
      if (channel) updateGuildSettings(guild.id, { invites_channel_id: channel.id });
    }
  }
}

async function ensureInviteStickyExists(guild, settings) {
  if (!settings.invites_channel_id || settings.invites_sticky_message_id) return;

  const channel = await guild.channels.fetch(settings.invites_channel_id).catch(() => null);
  if (!channel?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle("📨 Recompensas por invitar")
    .setColor(0x5865f2)
    .setDescription("Por cada **5 invitaciones** válidas conseguís **1 día** del producto que esté disponible en stock. ¡Seguí invitando gente al server! 🚀");

  const sticky = await channel.send({ embeds: [embed] }).catch(() => null);
  if (sticky) updateGuildSettings(guild.id, { invites_sticky_message_id: sticky.id });
}

const STOCK_KEYS_PERMS = [
  { id: CEITO_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
  { id: DEVELOPER_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
];

async function ensureStockKeysSetup(guild, settings) {
  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    console.warn(`[auto-setup] Al bot le falta el permiso "Gestionar canales" en ${guild.name}, no puedo crear regenerar-stock-invitaciones.`);
    return;
  }

  let categoryId = settings.stock_keys_category_id;
  if (!(await channelStillExists(guild, categoryId))) {
    const existingCategory = findByName(guild, "📦┃Regenerar Stock Invitaciones", ChannelType.GuildCategory);
    if (existingCategory) {
      categoryId = existingCategory.id;
    } else {
      const category = await guild.channels
        .create({
          name: "📦┃Regenerar Stock Invitaciones",
          type: ChannelType.GuildCategory,
          position: guild.channels.cache.size,
          permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }, ...STOCK_KEYS_PERMS]
        })
        .catch(() => null);
      if (!category) return;
      categoryId = category.id;
    }
    updateGuildSettings(guild.id, { stock_keys_category_id: categoryId });
  }

  if (await channelStillExists(guild, settings.stock_keys_channel_id)) return;

  const existingChannel = findByName(guild, "🔑┃regenerar-stock-invitaciones", ChannelType.GuildText);
  if (existingChannel) {
    updateGuildSettings(guild.id, { stock_keys_channel_id: existingChannel.id });
    return;
  }

  const channel = await guild.channels
    .create({
      name: "🔑┃regenerar-stock-invitaciones",
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }, ...STOCK_KEYS_PERMS]
    })
    .catch(() => null);
  if (channel) updateGuildSettings(guild.id, { stock_keys_channel_id: channel.id });
}

async function ensureRecordatoriosSetup(guild, settings) {
  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) return;

  let categoryId = settings.recordatorios_category_id;
  if (!(await channelStillExists(guild, categoryId))) {
    const existingCategory = findByName(guild, "⏰┃Recordatorios", ChannelType.GuildCategory);
    if (existingCategory) {
      categoryId = existingCategory.id;
    } else {
      const category = await guild.channels
        .create({
          name: "⏰┃Recordatorios",
          type: ChannelType.GuildCategory,
          position: guild.channels.cache.size,
          permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }, ...STOCK_KEYS_PERMS]
        })
        .catch(() => null);
      if (!category) return;
      categoryId = category.id;
    }
    updateGuildSettings(guild.id, { recordatorios_category_id: categoryId });
  }

  if (await channelStillExists(guild, settings.recordatorios_channel_id)) return;

  const existingChannel = findByName(guild, "⏰┃recordatorios", ChannelType.GuildText);
  if (existingChannel) {
    updateGuildSettings(guild.id, { recordatorios_channel_id: existingChannel.id });
    return;
  }

  const channel = await guild.channels
    .create({
      name: "⏰┃recordatorios",
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }, ...STOCK_KEYS_PERMS]
    })
    .catch(() => null);
  if (channel) updateGuildSettings(guild.id, { recordatorios_channel_id: channel.id });
}

async function ensureBackupsSetup(guild, settings) {
  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) return;

  let categoryId = settings.backups_category_id;
  if (!(await channelStillExists(guild, categoryId))) {
    const existingCategory = findByName(guild, "🗄️┃Backups", ChannelType.GuildCategory);
    if (existingCategory) {
      categoryId = existingCategory.id;
    } else {
      const category = await guild.channels
        .create({
          name: "🗄️┃Backups",
          type: ChannelType.GuildCategory,
          position: guild.channels.cache.size,
          permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }, ...STOCK_KEYS_PERMS]
        })
        .catch(() => null);
      if (!category) return;
      categoryId = category.id;
    }
    updateGuildSettings(guild.id, { backups_category_id: categoryId });
  }

  if (await channelStillExists(guild, settings.backups_channel_id)) return;

  const existingChannel = findByName(guild, "🗄️┃backups", ChannelType.GuildText);
  if (existingChannel) {
    updateGuildSettings(guild.id, { backups_channel_id: existingChannel.id });
    return;
  }

  const channel = await guild.channels
    .create({
      name: "🗄️┃backups",
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }, ...STOCK_KEYS_PERMS]
    })
    .catch(() => null);
  if (channel) updateGuildSettings(guild.id, { backups_channel_id: channel.id });
}

async function runAutoSetup(client) {
  for (const guild of client.guilds.cache.values()) {
    const settings = getGuildSettings(guild.id);
    await ensureLogsSetup(guild, settings).catch((e) => console.error(`[auto-setup] logs en ${guild.name}:`, e.message));

    const refreshed = getGuildSettings(guild.id);
    await ensureInvitesSetup(guild, refreshed).catch((e) => console.error(`[auto-setup] invites en ${guild.name}:`, e.message));

    const refreshedInvites = getGuildSettings(guild.id);
    await ensureInviteStickyExists(guild, refreshedInvites).catch((e) => console.error(`[auto-setup] sticky invites en ${guild.name}:`, e.message));

    const refreshed2 = getGuildSettings(guild.id);
    await ensureStockKeysSetup(guild, refreshed2).catch((e) => console.error(`[auto-setup] stock-keys en ${guild.name}:`, e.message));

    const refreshed3 = getGuildSettings(guild.id);
    await ensureRecordatoriosSetup(guild, refreshed3).catch((e) => console.error(`[auto-setup] recordatorios en ${guild.name}:`, e.message));

    const refreshed4 = getGuildSettings(guild.id);
    await ensureBackupsSetup(guild, refreshed4).catch((e) => console.error(`[auto-setup] backups en ${guild.name}:`, e.message));
  }
}

module.exports = { runAutoSetup };
