const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { getGuildSettings, updateGuildSettings, createRobloxTicket, getRobloxTicketByChannel, updateRobloxTicket, claimKey, getAvailableResources } = require("../db/database");
const { getPlan, buildTicketEmbed, buildPaymentRow, buildMpEmbed, buildVerifyRow, buildPaypalEmbed, buildStaffConfirmRow } = require("./robloxPanel");
const { createPreference, searchPaymentByRef } = require("./mercadopago");
const { nextTicketNumber } = require("../db/database");
const crypto = require("crypto");

const RESOURCE = "ceitus-roblox";

async function openPurchaseTicket(guild, member, planId) {
  const plan = getPlan(planId);
  if (!plan) throw new Error("Plan desconocido: " + planId);

  const settings = getGuildSettings(guild.id);

  // Busca si ya tiene un ticket abierto para este plan
  const existing = guild.channels.cache.find(
    (c) => c.name?.startsWith(`roblox-`) && c.topic?.includes(member.id)
  );
  if (existing) return { channel: existing, created: false };

  const category = settings.roblox_tickets_category_id
    ? await guild.channels.fetch(settings.roblox_tickets_category_id).catch(() => null)
    : null;

  const num = nextTicketNumber(guild.id);
  const channel = await guild.channels.create({
    name: `roblox-${String(num).padStart(4, "0")}`,
    type: ChannelType.GuildText,
    topic: `Ticket de ${member.user.tag} (${member.id}) | Plan: ${plan.label}`,
    parent: category?.id ?? null,
    permissionOverwrites: [
      { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
      { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }
    ]
  });

  // Añade permisos al staff si está configurado
  const staffRoleId = settings.roblox_customer_role_id ? null : null; // usa el rol de staff general si existe
  const shopStaff = settings.shop_staff_role_id;
  if (shopStaff) {
    await channel.permissionOverwrites.create(shopStaff, { ViewChannel: true, SendMessages: true }).catch(() => {});
  }

  const ticketEmbed = buildTicketEmbed(member, plan);
  const paymentRow = buildPaymentRow(planId);

  const msg = await channel.send({ content: `${member}`, embeds: [ticketEmbed], components: [paymentRow] });

  createRobloxTicket(guild.id, channel.id, member.id, planId, plan.price);

  return { channel, created: true };
}

async function handleSelectMercadoPago(interaction, planId) {
  const plan = getPlan(planId);
  if (!plan) return interaction.reply({ content: "Plan inválido.", flags: 64 });

  await interaction.deferReply({ flags: 64 });

  const ticket = getRobloxTicketByChannel(interaction.channelId);
  if (!ticket) return interaction.editReply({ content: "No encontré el ticket." });

  const ref = `roblox-${ticket.id}-${crypto.randomBytes(4).toString("hex")}`;

  let preference;
  try {
    preference = await createPreference(plan.label, plan.price, ref, null);
  } catch (e) {
    console.error("[roblox-mp] Error creando preferencia:", e.message);
    return interaction.editReply({ content: "❌ Error al generar el link de MercadoPago. Avisale al staff." });
  }

  updateRobloxTicket(interaction.channelId, {
    payment_method: "mp",
    mp_preference_id: preference.id,
    mp_reference: ref
  });

  const mpEmbed = buildMpEmbed(plan, preference.init_point);
  const verifyRow = buildVerifyRow(planId);

  await interaction.message.edit({ components: [] }).catch(() => {});
  await interaction.channel.send({ embeds: [mpEmbed], components: [verifyRow] });
  await interaction.editReply({ content: "✅ Link de pago generado." });
}

async function handleSelectPayPal(interaction, planId) {
  const plan = getPlan(planId);
  if (!plan) return interaction.reply({ content: "Plan inválido.", flags: 64 });

  const ticket = getRobloxTicketByChannel(interaction.channelId);
  if (!ticket) return interaction.reply({ content: "No encontré el ticket.", flags: 64 });

  updateRobloxTicket(interaction.channelId, { payment_method: "paypal" });

  const ppEmbed = buildPaypalEmbed(plan);
  const staffRow = buildStaffConfirmRow(planId, ticket.user_id);

  await interaction.message.edit({ components: [] }).catch(() => {});
  await interaction.channel.send({ embeds: [ppEmbed], components: [staffRow] });
  await interaction.reply({ content: "✅ Instrucciones enviadas.", flags: 64 });
}

async function handleVerifyMercadoPago(interaction, planId) {
  const ticket = getRobloxTicketByChannel(interaction.channelId);
  if (!ticket || !ticket.mp_reference) {
    return interaction.reply({ content: "No encontré la referencia de pago.", flags: 64 });
  }

  await interaction.deferReply({ flags: 64 });

  const payment = await searchPaymentByRef(ticket.mp_reference);
  if (!payment) {
    return interaction.editReply({ content: "❌ Todavía no detecto el pago. Esperá unos segundos y volvé a verificar." });
  }

  await deliverAccess(interaction, ticket, planId, "MercadoPago");
}

async function handleConfirmPayPal(interaction, planId, userId) {
  const { isStaffOrCeito } = require("../utils/permissions");
  if (!isStaffOrCeito(interaction)) {
    return interaction.reply({ content: "Solo el staff puede confirmar pagos de PayPal.", flags: 64 });
  }

  const ticket = getRobloxTicketByChannel(interaction.channelId);
  if (!ticket) return interaction.reply({ content: "No encontré el ticket.", flags: 64 });

  await interaction.deferReply({ flags: 64 });
  await deliverAccess(interaction, ticket, planId, "PayPal");
}

async function deliverAccess(interaction, ticket, planId, method) {
  const plan = getPlan(planId);
  const guild = interaction.guild;
  const settings = getGuildSettings(guild.id);

  // Saca la key del stock
  const key = claimKey(guild.id, RESOURCE, ticket.user_id);
  if (!key) {
    await interaction.editReply({
      content: `❌ Sin stock de \`${RESOURCE}\`. Cargá keys con \`/stock cargar\` y volvé a verificar.`
    });
    return;
  }

  updateRobloxTicket(interaction.channelId, { status: "completed" });

  // Asigna el rol cliente
  if (settings.roblox_customer_role_id) {
    const member = await guild.members.fetch(ticket.user_id).catch(() => null);
    if (member) {
      await member.roles.add(settings.roblox_customer_role_id).catch(() => {});
    }
  }

  const deliveryEmbed = new EmbedBuilder()
    .setTitle("🎉 ¡Pago confirmado! Acá está tu acceso")
    .setColor(0x2ecc71)
    .addFields(
      { name: "Plan",    value: plan?.label ?? planId,          inline: true },
      { name: "Método",  value: method,                         inline: true },
      { name: "Tu Key",  value: `\`\`\`${key.key_value}\`\`\`` }
    )
    .setDescription(
      `Abrí el loader de **Ceitus Roblox**, entrá a **Activar**, pegá la key y listo.\n` +
      `Guardá este mensaje — por ahora no hay recuperación de key.`
    )
    .setTimestamp();

  await interaction.message.edit({ components: [] }).catch(() => {});
  await interaction.channel.send({ content: `<@${ticket.user_id}>`, embeds: [deliveryEmbed] });
  await interaction.editReply({ content: "✅ Acceso entregado." });

  // Publica en canal de proofs si está configurado
  if (settings.roblox_proofs_channel_id) {
    const proofsCh = await guild.channels.fetch(settings.roblox_proofs_channel_id).catch(() => null);
    if (proofsCh?.isTextBased()) {
      const buyer = await guild.members.fetch(ticket.user_id).catch(() => null);
      const proofEmbed = new EmbedBuilder()
        .setTitle("✅ Nueva compra — Ceitus Roblox")
        .setColor(0x2ecc71)
        .addFields(
          { name: "Comprador", value: buyer ? `${buyer}` : `<@${ticket.user_id}>`, inline: true },
          { name: "Plan",      value: plan?.label ?? planId,                        inline: true },
          { name: "Método",    value: method,                                       inline: true }
        )
        .setTimestamp();
      await proofsCh.send({ embeds: [proofEmbed] }).catch(() => {});
    }
  }

  // Alerta de stock bajo
  const stock = getAvailableResources(guild.id).find((r) => r.resource === RESOURCE)?.stock ?? 0;
  if (stock <= 2 && settings.stock_keys_channel_id) {
    const stockCh = await guild.channels.fetch(settings.stock_keys_channel_id).catch(() => null);
    if (stockCh?.isTextBased()) {
      await stockCh.send(
        stock === 0
          ? `🚨 **${RESOURCE}** se quedó sin stock. Cargá más keys con \`/stock cargar\`.`
          : `⚠️ Stock bajo de **${RESOURCE}**: quedan **${stock}**.`
      ).catch(() => {});
    }
  }
}

async function handleCloseTicket(interaction) {
  if (!interaction.channel?.name?.startsWith("roblox-")) {
    return interaction.reply({ content: "Este botón solo funciona en tickets de Ceitus Roblox.", flags: 64 });
  }
  await interaction.reply({ content: "🔒 Cerrando ticket..." });
  await interaction.channel.delete().catch(() => {});
}

module.exports = {
  openPurchaseTicket,
  handleSelectMercadoPago,
  handleSelectPayPal,
  handleVerifyMercadoPago,
  handleConfirmPayPal,
  handleCloseTicket
};
