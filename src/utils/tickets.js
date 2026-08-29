const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { getGuildSettings, updateGuildSettings } = require("../db/database");
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

async function getOrCreateTicketsCategory(guild) {
  const settings = getGuildSettings(guild.id);

  if (settings.shop_ticket_category_id) {
    const existing = await guild.channels.fetch(settings.shop_ticket_category_id).catch(() => null);
    if (existing) return existing;
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
    name: `ticket-${member.user.username}`.slice(0, 90),
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

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ticket_close:${channel.id}`).setLabel("Cerrar ticket").setStyle(ButtonStyle.Danger).setEmoji("🔒")
  );

  await channel.send({ content: `${member} · ${staffRoleIds(guild).map((id) => `<@&${id}>`).join(" ")}`, embeds: [embed], components: [closeRow] });

  return channel;
}

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

module.exports = { getOrCreateTicketsCategory, getOrCreateLogsChannel, createProductTicket, closeTicket, staffRoleIds };
