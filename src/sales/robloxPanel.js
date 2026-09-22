const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const PLANS = [
  { id: "3d",  label: "3 Días",  days: 3,  price: 0.99 },
  { id: "12d", label: "12 Días", days: 12, price: 2.49 },
  { id: "1m",  label: "1 Mes",   days: 30, price: 4.99 }
];

function getPlan(planId) {
  return PLANS.find((p) => p.id === planId) ?? null;
}

function buildSalesPanel() {
  const embed = new EmbedBuilder()
    .setTitle("🎮 Ceitus Roblox — Panel de Ventas")
    .setColor(0xe60000)
    .setDescription(
      "Acceso premium a **Ceitus para Roblox**.\nElegí tu plan y se abre un ticket automáticamente."
    )
    .addFields(
      PLANS.map((p) => ({
        name: `${p.label}`,
        value: `**$${p.price.toFixed(2)} USD**`,
        inline: true
      }))
    )
    .setFooter({ text: "Ceitus · Pagos vía MercadoPago o PayPal" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    PLANS.map((p) =>
      new ButtonBuilder()
        .setCustomId(`roblox_buy:${p.id}`)
        .setLabel(`${p.label} — $${p.price.toFixed(2)}`)
        .setStyle(ButtonStyle.Primary)
    )
  );

  return { embeds: [embed], components: [row] };
}

function buildTicketEmbed(member, plan) {
  return new EmbedBuilder()
    .setTitle(`🛒 Compra — Ceitus Roblox ${plan.label}`)
    .setColor(0xe60000)
    .addFields(
      { name: "Plan",   value: plan.label,                    inline: true },
      { name: "Precio", value: `$${plan.price.toFixed(2)} USD`, inline: true },
      { name: "Usuario", value: `${member}`,                  inline: true }
    )
    .setDescription("Elegí tu método de pago:")
    .setTimestamp();
}

function buildPaymentRow(planId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`roblox_pay_mp:${planId}`)
      .setLabel("💳 MercadoPago")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`roblox_pay_pp:${planId}`)
      .setLabel("💰 PayPal")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("roblox_close_ticket")
      .setLabel("✖ Cancelar")
      .setStyle(ButtonStyle.Danger)
  );
}

function buildMpEmbed(plan, payLink) {
  return new EmbedBuilder()
    .setTitle("💳 Pago con MercadoPago")
    .setColor(0x009ee3)
    .setDescription(
      `**Plan:** ${plan.label} — **$${plan.price.toFixed(2)} USD**\n\n` +
      `[➡️ Hacer click acá para pagar](${payLink})\n\n` +
      `Después de pagar presioná **✅ Verificar Pago** y tu acceso se entrega automáticamente.`
    )
    .setFooter({ text: "El pago se verifica automáticamente con MercadoPago" });
}

function buildVerifyRow(planId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`roblox_verify_mp:${planId}`)
      .setLabel("✅ Verificar Pago")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("roblox_close_ticket")
      .setLabel("✖ Cancelar")
      .setStyle(ButtonStyle.Danger)
  );
}

function buildPaypalEmbed(plan) {
  return new EmbedBuilder()
    .setTitle("💰 Pago con PayPal")
    .setColor(0x003087)
    .setDescription(
      `**Plan:** ${plan.label} — **$${plan.price.toFixed(2)} USD**\n\n` +
      `📧 Enviá el pago a:\n\`\`\`${process.env.ROBLOX_PAYPAL_EMAIL}\`\`\`\n` +
      `Poné en el **concepto/nota**: \`Ceitus Roblox ${plan.label}\`\n\n` +
      `Cuando envíes el comprobante acá, el staff lo confirma y recibís tu acceso.`
    )
    .setFooter({ text: "Pagos de PayPal confirmados manualmente por staff" });
}

function buildStaffConfirmRow(planId, userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`roblox_confirm_pp:${planId}:${userId}`)
      .setLabel("✅ Confirmar Pago (Staff)")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("roblox_close_ticket")
      .setLabel("✖ Cancelar")
      .setStyle(ButtonStyle.Danger)
  );
}

module.exports = {
  PLANS,
  getPlan,
  buildSalesPanel,
  buildTicketEmbed,
  buildPaymentRow,
  buildMpEmbed,
  buildVerifyRow,
  buildPaypalEmbed,
  buildStaffConfirmRow
};
