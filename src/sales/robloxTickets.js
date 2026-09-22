const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const {
  getGuildSettings,
  createRobloxTicket,
  getRobloxTicketByChannel,
  updateRobloxTicket,
  claimKey,
  getAvailableResources,
  nextTicketNumber
} = require("../db/database");
const { getPlan, genRef, buildTicketEmbed, buildTicketButtons } = require("./robloxPanel");
const { isStaffOrCeito } = require("../utils/permissions");

const RESOURCE = "ceitus-roblox";

async function openPurchaseTicket(guild, member, planId) {
  const plan = getPlan(planId);
  if (!plan) throw new Error("Plan desconocido: " + planId);

  const settings = getGuildSettings(guild.id);

  // Ticket ya abierto
  const existing = guild.channels.cache.find(
    (c) => c.topic?.includes(member.id) && c.name?.startsWith("roblox-")
  );
  if (existing) return { channel: existing, created: false };

  const category = settings.roblox_tickets_category_id
    ? await guild.channels.fetch(settings.roblox_tickets_category_id).catch(() => null)
    : null;

  const num = nextTicketNumber(guild.id);
  const ref = genRef();

  const channel = await guild.channels.create({
    name: `roblox-${String(num).padStart(4, "0")}`,
    type: ChannelType.GuildText,
    topic: `Ticket de ${member.user.tag} (${member.id}) | Plan: ${plan.labelEs} | Ref: ${ref}`,
    parent: category?.id ?? null,
    permissionOverwrites: [
      { id: guild.roles.everyone,   deny:  [PermissionFlagsBits.ViewChannel] },
      { id: member.id,              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }
    ]
  });

  if (settings.shop_staff_role_id) {
    await channel.permissionOverwrites.create(settings.shop_staff_role_id, {
      ViewChannel: true, SendMessages: true
    }).catch(() => {});
  }

  const { embed: ticketEmbed, paypalUrl } = await buildTicketEmbed(member, plan, ref);
  const buttons = buildTicketButtons(planId, member.id, paypalUrl);

  await channel.send({ content: `${member}`, embeds: [ticketEmbed], components: [buttons] });

  createRobloxTicket(guild.id, channel.id, member.id, planId, plan.price);
  updateRobloxTicket(channel.id, { mp_reference: ref });

  return { channel, created: true };
}

async function handleDeliverKey(interaction, planId, userId) {
  if (!isStaffOrCeito(interaction)) {
    return interaction.reply({ content: "Solo el staff puede entregar keys.", flags: 64 });
  }

  const ticket = getRobloxTicketByChannel(interaction.channelId);
  if (!ticket) return interaction.reply({ content: "No encontré el ticket.", flags: 64 });

  await interaction.deferReply({ flags: 64 });
  await deliverAccess(interaction, ticket, planId, userId);
}

async function handleCloseTicket(interaction) {
  if (!interaction.channel?.name?.startsWith("roblox-")) {
    return interaction.reply({ content: "Este botón solo funciona en tickets de Ceitus Roblox.", flags: 64 });
  }
  await interaction.reply({ content: "🔒 Cerrando ticket..." });
  await interaction.channel.delete().catch(() => {});
}

async function deliverAccess(interaction, ticket, planId, userId) {
  const plan = getPlan(planId);
  const guild = interaction.guild;
  const settings = getGuildSettings(guild.id);

  const key = claimKey(guild.id, RESOURCE, userId);
  if (!key) {
    return interaction.editReply({
      content: `❌ Sin stock de \`${RESOURCE}\`. Cargá más keys con \`/stock cargar\` y reintentá.`
    });
  }

  updateRobloxTicket(interaction.channelId, { status: "completed" });

  if (settings.roblox_customer_role_id) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member) await member.roles.add(settings.roblox_customer_role_id).catch(() => {});
  }

  const deliveryEmbed = new EmbedBuilder()
    .setTitle("🎉 ¡Pago confirmado! / Payment Confirmed!")
    .setColor(0x2ecc71)
    .setDescription(
      `<@${userId}> — **Acá está tu acceso / Here's your access:**\n\n` +
      `🔑 **Key:**\n\`\`\`${key.key_value}\`\`\`\n` +
      `**Plan:** ${plan?.labelEs ?? planId}\n\n` +
      `Abrí el loader de **Ceitus Roblox**, entrá a **Activar**, pegá la key y listo.\n` +
      `*Guardá este mensaje — no hay recuperación de key.*`
    )
    .setTimestamp();

  await interaction.message.edit({ components: [] }).catch(() => {});
  await interaction.channel.send({ content: `<@${userId}>`, embeds: [deliveryEmbed] });
  await interaction.editReply({ content: "✅ Key entregada." });

  if (settings.roblox_proofs_channel_id) {
    const proofsCh = await guild.channels.fetch(settings.roblox_proofs_channel_id).catch(() => null);
    if (proofsCh?.isTextBased()) {
      const member = await guild.members.fetch(userId).catch(() => null);
      const proofEmbed = new EmbedBuilder()
        .setTitle("✅ Nueva compra — Ceitus Roblox External")
        .setColor(0x2ecc71)
        .addFields(
          { name: "Comprador", value: member ? `${member}` : `<@${userId}>`, inline: true },
          { name: "Plan",      value: plan?.labelEs ?? planId,               inline: true }
        )
        .setTimestamp();
      await proofsCh.send({ embeds: [proofEmbed] }).catch(() => {});
    }
  }

  const stock = getAvailableResources(guild.id).find((r) => r.resource === RESOURCE)?.stock ?? 0;
  if (stock <= 2 && settings.stock_keys_channel_id) {
    const stockCh = await guild.channels.fetch(settings.stock_keys_channel_id).catch(() => null);
    if (stockCh?.isTextBased()) {
      await stockCh.send(
        stock === 0
          ? `🚨 **${RESOURCE}** sin stock. Cargá más keys con \`/stock cargar\`.`
          : `⚠️ Stock bajo de **${RESOURCE}**: quedan **${stock}**.`
      ).catch(() => {});
    }
  }
}

module.exports = { openPurchaseTicket, handleDeliverKey, handleCloseTicket };
