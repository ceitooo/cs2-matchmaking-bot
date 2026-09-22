const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getRates, toArs, toUyu } = require("./cotizacion");
const crypto = require("crypto");

const PLANS = [
  { id: "3d",  labelEs: "3 Días",  labelEn: "3 Days",  days: 3,  price: 0.99 },
  { id: "12d", labelEs: "12 Días", labelEn: "12 Days", days: 12, price: 2.49 },
  { id: "1m",  labelEs: "1 Mes",   labelEn: "Monthly", days: 30, price: 4.99 }
];

const PANEL_IMAGE = process.env.ROBLOX_PANEL_IMAGE_URL ?? "";

function getPlan(planId) {
  return PLANS.find((p) => p.id === planId) ?? null;
}

function genRef() {
  return "ORD-" + crypto.randomBytes(5).toString("hex").toUpperCase().slice(0, 8);
}

async function buildSalesPanel(status = "activo", version = null) {
  const rates = await getRates();

  const priceLines = PLANS.map((p) => {
    const ars = toArs(p.price, rates.ars);
    return `\`${p.labelEs} - ${p.labelEn}: ${ars.toLocaleString()} ARS — ${p.price.toFixed(2)} USD\``;
  }).join("\n");

  const isActive = status === "activo";
  const statusLine = isActive
    ? "🟢 **ACTIVO / UNDETECTED** — (External — VAC Safe)"
    : "🔴 **EN MANTENIMIENTO** — Actualizando para la nueva versión de Roblox...";

  const versionLine = version ? `\n🔄 **Versión Roblox:** \`${version}\`` : "";

  const embed = new EmbedBuilder()
    .setTitle("🛒 Ceitus 「Roblox」 External")
    .setColor(isActive ? 0xe60000 : 0xff8800)
    .setDescription(
      `${statusLine}${versionLine}\n\n` +
      `🇪🇸 Software externo para Roblox. **Entrega automática inmediata y activación en la nube.**\n` +
      `🇺🇸 External software for Roblox. **Instant automated delivery and cloud activation.**\n\n` +
      `**Precios | Prices:**\n${priceLines}\n\n` +
      `${"─".repeat(28)}\n` +
      `**Pagos / Payments:** 💙 PayPal | 💙 Mercado Pago | 💳 Tarjetas / Cards\n\n` +
      (isActive ? `🛒 **Despliega el menú de abajo para seleccionar tu plan / Select a plan below:**` : `⏳ **Volvé más tarde — Back soon!**`)
    )
    .setFooter({ text: "Ceitus 「Roblox」 External — Instant Delivery — Entrega Inmediata" });

  if (PANEL_IMAGE) embed.setImage(PANEL_IMAGE);

  const selectOptions = PLANS.map((p) => ({
    label: `🛒 ${p.labelEs} - ${p.labelEn}`,
    description: `${toArs(p.price, rates.ars).toLocaleString()} ARS — ${p.price.toFixed(2)} USD`,
    value: `roblox_plan_${p.id}`
  }));

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("roblox_select_plan")
      .setPlaceholder(isActive ? "🛒 Selecciona un plan para Roblox..." : "⏳ En mantenimiento — volvé más tarde")
      .setDisabled(!isActive)
      .addOptions(selectOptions)
  );

  return { embeds: [embed], components: [row] };
}

// Datos hardcodeados como fallback si no están en el .env del servidor
const MP_ALIAS   = process.env.ROBLOX_MP_ALIAS    || "luana28cortez.mp";
const MP_CVU     = process.env.ROBLOX_MP_CVU      || "0000003100046563350684";
const MP_TITULAR = process.env.ROBLOX_MP_TITULAR  || "Luana Milena Cortez Mansilla";
const PP_EMAIL   = process.env.ROBLOX_PAYPAL_EMAIL || "holadariobueno@gmail.com";

async function buildTicketEmbed(member, plan, ref) {
  const rates = await getRates();
  const ars = toArs(plan.price, rates.ars);
  const uyu = toUyu(plan.price, rates.uyu);

  // PayPal donate link (reemplaza el deprecado cgi-bin/webscr)
  const paypalLink =
    `https://www.paypal.com/donate?business=${encodeURIComponent(PP_EMAIL)}` +
    `&amount=${plan.price.toFixed(2)}&currency_code=USD` +
    `&item_name=${encodeURIComponent(`Ceitus Roblox ${plan.labelEs} - ${ref}`)}` +
    `&no_recurring=1&no_note=0`;

  const embed = new EmbedBuilder()
    .setTitle("🛒 Orden de Compra / Purchase Order — Ceitus 「Roblox」 External")
    .setColor(0xe60000)
    .setDescription(
      `**Cliente / Customer:** ${member}\n\n` +
      `📦 **Producto / Product:** Ceitus 「Roblox」 External\n` +
      `🛒 **Plan:** ${plan.labelEs} - ${plan.labelEn} — **$${plan.price.toFixed(2)} USD**\n` +
      `🇦🇷 **Pesos Argentinos (ARS):** ~**$ ${ars.toLocaleString()} ARS** *(Cotización Blue/Cripto)*\n` +
      `🇺🇾 **Pesos Uruguayos (UYU):** ~**$${uyu.toLocaleString()} UYU**\n` +
      `**Referencia / Reference:** \`${ref}\`\n\n` +
      `${"─".repeat(28)}\n\n` +
      `**Datos para Pago / Payment Details:**\n` +
      `• 💙 🇦🇷 **Mercado Pago (Transferencia Directa — 0% Recargo):**\n` +
      `  ◦ Alias: \`${MP_ALIAS}\`\n` +
      `  ◦ CVU: \`${MP_CVU}\`\n` +
      `  ◦ Titular: \`${MP_TITULAR}\`\n` +
      `  ◦ Monto exacto a transferir: **$ ${ars.toLocaleString()} ARS**\n` +
      `  ◦ *Transferí desde tu banco o Mercado Pago sin comisiones y adjuntá la captura aquí.*\n` +
      `• 💙 🇺🇾 **Prex:**\n` +
      `  ◦ Titular: \`Dario Bueno\`\n` +
      `  ◦ Cuenta Prex: \`21059530\`\n` +
      `  ◦ Enviá el comprobante en este canal para que el staff verifique y entregue tu key.\n` +
      `• 💙 🌎 **PayPal:** [Haz clic aquí para pagar ($${plan.price.toFixed(2)} USD)](${paypalLink})\n` +
      `• **¡Entrega automática 24/7 instantánea!**\n` +
      `• **Nota / Referencia:** \`${ref}\`\n\n` +
      `📌 **Instrucciones:**\n` +
      `1. Si pagás por **Mercado Pago o Prex**, transferí el monto exacto al Alias/CVU indicado y **enviá el comprobante en este ticket**.\n` +
      `2. Si pagás por **PayPal**, hacé clic en el botón de abajo para pagar en USD (se verifica automáticamente).\n` +
      `3. El staff verificará tu transferencia y te entregará tu key al instante.`
    )
    .setFooter({ text: `${ref} - Ceitus 「Roblox」 External` })
    .setTimestamp();

  return { embed, paypalUrl: paypalLink };
}

function buildTicketButtons(planId, userId, paypalUrl) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setURL(paypalUrl)
      .setLabel("Pagar con PayPal (USD)")
      .setStyle(ButtonStyle.Link),
    new ButtonBuilder()
      .setCustomId(`roblox_deliver:${planId}:${userId}`)
      .setLabel("Entregar Key (Staff)")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("roblox_close_ticket")
      .setLabel("Cerrar / Close")
      .setStyle(ButtonStyle.Danger)
  );
  return row;
}

module.exports = { PLANS, getPlan, genRef, buildSalesPanel, buildTicketEmbed, buildTicketButtons };
