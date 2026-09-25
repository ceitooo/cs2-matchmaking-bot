const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { getGuildSettings, updateGuildSettings, nextTicketNumber } = require("../db/database");

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "ticket";
}

function ticketChannelName(label, guildId) {
  return `${slugify(label)}-${String(nextTicketNumber(guildId)).padStart(4, "0")}`;
}
const { CEITO_ROLE_ID } = require("./permissions");

const TICKETS_CATEGORY_NAME = "🎫・Tickets";
const LOGS_CHANNEL_NAME = "📝・ticket-logs";

function staffRoleIds(guild) {
  const ids = new Set([CEITO_ROLE_ID]);
  for (const role of guild.roles.cache.values()) {
    if (role.permissions.has(PermissionFlagsBits.Administrator) || role.permissions.has(PermissionFlagsBits.ManageGuild)) {
      ids.add(role.id);
    }
  }
  return [...ids].filter((id) => guild.roles.cache.has(id));
}

// Solo el rol "Staff" y el rol "ceito" — a diferencia de staffRoleIds() (usado para permisos
// de canal), esto es lo que se menciona en los pings para no molestar a otros roles con
// permisos de administrador (ej: bots como carl-bot o Sapphire).
function pingRoleIds(guild) {
  const ids = new Set([CEITO_ROLE_ID]);
  const staffRole = guild.roles.cache.find((r) => r.name.toLowerCase() === "staff");
  if (staffRole) ids.add(staffRole.id);
  return [...ids].filter((id) => guild.roles.cache.has(id));
}

const PING_COOLDOWN_MS = 25_000;
const lastPingByChannel = new Map();

function canPing(channelId) {
  const last = lastPingByChannel.get(channelId) ?? 0;
  const remaining = PING_COOLDOWN_MS - (Date.now() - last);
  return remaining <= 0 ? { ok: true } : { ok: false, remainingSeconds: Math.ceil(remaining / 1000) };
}

function registerPing(channelId) {
  lastPingByChannel.set(channelId, Date.now());
}

async function getOrCreateTicketsCategory(guild) {
  const settings = getGuildSettings(guild.id);

  if (settings.shop_ticket_category_id) {
    const existing = await guild.channels.fetch(settings.shop_ticket_category_id).catch(() => null);
    if (existing) return existing;
  }

  await guild.channels.fetch().catch(() => {});
  const byName = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === TICKETS_CATEGORY_NAME);
  if (byName) {
    updateGuildSettings(guild.id, { shop_ticket_category_id: byName.id });
    return byName;
  }

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    ...staffRoleIds(guild).map((id) => ({
      id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
    }))
  ];

  const category = await guild.channels.create({
    name: TICKETS_CATEGORY_NAME,
    type: ChannelType.GuildCategory,
    permissionOverwrites: overwrites
  });

  await category.setPosition(0).catch(() => {});
  updateGuildSettings(guild.id, { shop_ticket_category_id: category.id });
  return category;
}

async function getOrCreateLogsChannel(guild) {
  const category = await getOrCreateTicketsCategory(guild);
  const existing = category.children?.cache.find((c) => c.name === LOGS_CHANNEL_NAME);
  if (existing) return existing;

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    ...staffRoleIds(guild).map((id) => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] }))
  ];

  return guild.channels.create({
    name: LOGS_CHANNEL_NAME,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: overwrites
  });
}

async function createProductTicket(guild, member, product) {
  const category = await getOrCreateTicketsCategory(guild);
  await getOrCreateLogsChannel(guild).catch(() => {});

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    ...staffRoleIds(guild).map((id) => ({
      id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
    })),
    {
      id: member.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    }
  ];

  const channel = await guild.channels.create({
    name: ticketChannelName(product.name, guild.id),
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `Ticket de ${member.id} · Producto: ${product.name} (${product.price})`,
    permissionOverwrites: overwrites
  });

  await channel.setPosition(0).catch(() => {});

  const embed = new EmbedBuilder()
    .setColor(0xe91e8c)
    .setTitle("🎫 Ticket de compra")
    .setDescription(`Producto: **${product.name}**\nPrecio: **${product.price}**\n\nEl staff te va a atender por acá. Cuando termine la venta, un staff puede cerrar el ticket.`);

  const buttonsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ticket_close:${channel.id}`).setLabel("Cerrar ticket").setStyle(ButtonStyle.Danger).setEmoji("🔒"),
    new ButtonBuilder().setCustomId(`ticket_ping:${channel.id}`).setLabel("Avisar al staff").setStyle(ButtonStyle.Secondary).setEmoji("🔔"),
    new ButtonBuilder().setCustomId(`ticket_renew:${channel.id}:${member.id}`).setLabel("Programar renovación").setStyle(ButtonStyle.Primary).setEmoji("🔁")
  );

  await channel.send({
    content: `${member} · ${pingRoleIds(guild).map((id) => `<@&${id}>`).join(" ")}`,
    embeds: [embed],
    components: [buttonsRow]
  });
  registerPing(channel.id);

  return channel;
}

const SIMPLE_TICKET_TYPES = {
  alianza: {
    label: "solicitud de alianza",
    topicPrefix: "Alianza de",
    topicSuffix: "Solicitud de alianza",
    color: 0x5865f2,
    title: "🤝 Solicitud de alianza",
    description: "Contanos acá el nombre de tu servidor, la cantidad de miembros, de qué trata y el link de invitación. El staff te va a responder por este canal."
  },
  soporte: {
    label: "soporte",
    topicPrefix: "Soporte de",
    topicSuffix: "Ticket de soporte",
    color: 0x2ecc71,
    title: "🆘 Ticket de soporte",
    description: "Contanos qué problema tenés o qué necesitás, con todos los detalles que puedas (capturas, producto, cuándo pasó). El staff te va a responder por este canal."
  }
};

async function createSimpleTicket(guild, member, type) {
  const config = SIMPLE_TICKET_TYPES[type];
  const category = await getOrCreateTicketsCategory(guild);
  await getOrCreateLogsChannel(guild).catch(() => {});

  await guild.channels.fetch().catch(() => {});
  const existing = guild.channels.cache.find((c) => c.parentId === category.id && c.topic?.startsWith(`${config.topicPrefix} ${member.id}`));
  if (existing) return { channel: existing, created: false };

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    ...staffRoleIds(guild).map((id) => ({
      id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
    })),
    { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
  ];

  const channel = await guild.channels.create({
    name: ticketChannelName(config.label, guild.id),
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `${config.topicPrefix} ${member.id} · ${config.topicSuffix}`,
    permissionOverwrites: overwrites
  });

  await channel.setPosition(0).catch(() => {});

  const embed = new EmbedBuilder().setColor(config.color).setTitle(config.title).setDescription(config.description);

  const buttonsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ticket_close:${channel.id}`).setLabel("Cerrar ticket").setStyle(ButtonStyle.Danger).setEmoji("🔒"),
    new ButtonBuilder().setCustomId(`ticket_ping:${channel.id}`).setLabel("Avisar al staff").setStyle(ButtonStyle.Secondary).setEmoji("🔔")
  );

  await channel.send({
    content: `${member} · ${pingRoleIds(guild).map((id) => `<@&${id}>`).join(" ")}`,
    embeds: [embed],
    components: [buttonsRow]
  });
  registerPing(channel.id);

  return { channel, created: true };
}

const createAllianceTicket = (guild, member) => createSimpleTicket(guild, member, "alianza");
const createSupportTicket = (guild, member) => createSimpleTicket(guild, member, "soporte");

async function closeTicket(channel, closedBy) {
  const messages = [];
  let before;
  for (let i = 0; i < 10; i++) {
    const batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) }).catch(() => null);
    if (!batch || batch.size === 0) break;
    messages.push(...batch.values());
    before = batch.last().id;
    if (batch.size < 100) break;
  }
  messages.reverse();

  const lines = messages.map((m) => {
    const time = new Date(m.createdTimestamp).toISOString();
    const content = m.content || (m.attachments.size ? `[adjunto: ${[...m.attachments.values()].map((a) => a.url).join(", ")}]` : "[sin contenido]");
    return `[${time}] ${m.author.tag}: ${content}`;
  });

  const transcript = lines.join("\n") || "(sin mensajes)";
  const buffer = Buffer.from(transcript, "utf-8");
  const attachment = new AttachmentBuilder(buffer, { name: `${channel.name}.txt` });

  const logsChannel = await getOrCreateLogsChannel(channel.guild).catch(() => null);
  if (logsChannel) {
    const embed = new EmbedBuilder()
      .setColor(0xe91e8c)
      .setTitle(`🔒 Ticket cerrado: #${channel.name}`)
      .setDescription(`${channel.topic ?? "Sin datos del ticket."}\nCerrado por: ${closedBy}`)
      .setTimestamp();

    await logsChannel.send({ embeds: [embed], files: [attachment] }).catch(() => {});
  }
}

module.exports = {
  createAllianceTicket,
  createSupportTicket,
  getOrCreateTicketsCategory,
  getOrCreateLogsChannel,
  createProductTicket,
  closeTicket,
  staffRoleIds,
  pingRoleIds,
  canPing,
  registerPing
};
