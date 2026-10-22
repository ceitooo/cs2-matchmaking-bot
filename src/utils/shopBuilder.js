const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { db } = require("../db/database");

const DEFAULT_PRODUCTS = {
  1: { id: 1, name: "Bot de Discord personalizado", category: "Discord", price: "Consultar precio", description: "Bot exclusivo adaptado a las necesidades de tu servidor con comandos personalizados, sistemas de economía, tickets o moderación." },
  2: { id: 2, name: "CeitoTweaks Premium (Licencia)", category: "CeitoTweaks", price: "USD 4.99 / Consultar ARS", description: "Acceso completo a CeitoTweaks Premium: Modo Juego Turbo, Limpiador de RAM en espera, Asistente IA ilimitado, efectos exclusivos de perfil, banners animados y soporte prioritario." },
  3: { id: 3, name: "Optimización iOS", category: "Optimización", price: "Consultar precio", description: "Configuraciones avanzadas de rendimiento, menor latencia y optimización de batería y red para tu iPhone/iPad." },
  4: { id: 4, name: "Creación de servers", category: "Discord", price: "Consultar precio", description: "Diseño profesional de servidores de Discord: canales organizados, roles estéticos, permisos asegurados y bots esenciales configurados." },
  5: { id: 5, name: "Discord decoraciones", category: "Discord", price: "Consultar precio", description: "Banners, marcos de perfil y decoraciones exclusivas para tu cuenta o servidor de Discord." },
  6: { id: 6, name: "Optimización PC", category: "Optimización", price: "Consultar precio", description: "Optimización integral de Windows, latencia ultra baja, tweak de procesos, BIOS y rendimiento máximo para gaming competitivo." },
  7: { id: 7, name: "Optimización Android", category: "Optimización", price: "Consultar precio", description: "Optimización profunda para dispositivos Android: mejora de FPS, reducción de throttling térmico y limpieza de bloatware." },
  8: { id: 8, name: "Spoof de componentes", category: "Optimización", price: "Consultar precio", description: "Modificación de seriales de hardware y protección de identidad de componentes para tu equipo." },
  9: { id: 9, name: "Netflix Estándar (1 mes)", category: "Streaming", price: "USD 9.99 / Consultar ARS", description: "Cuenta de Netflix privada o perfil personalizable con código PIN propio. Acceso completo al catálogo con streaming en alta calidad." },
  10: { id: 10, name: "Disney+ Premium (1 mes)", category: "Streaming", price: "Consultar precio", description: "Acceso a Disney+ Premium con perfil propio personalizable. Disfruta de Disney, Pixar, Marvel, Star Wars y ESPN sin límites." },
  11: { id: 11, name: "Números virtuales", category: "Otros", price: "Consultar precio", description: "Números virtuales seguros para activación de cuentas (WhatsApp, Telegram, Discord, etc.) de múltiples países." }
};

function getProducts(guildId) {
  try {
    const list = db.prepare("SELECT * FROM shop_products WHERE guild_id = ? ORDER BY category ASC, position ASC, id ASC").all(guildId);
    if (list && list.length > 0) return list;
  } catch (_) {}
  return Object.values(DEFAULT_PRODUCTS);
}

function getProductById(productId, guildId) {
  try {
    const p = db.prepare("SELECT * FROM shop_products WHERE id = ? AND guild_id = ?").get(productId, guildId);
    if (p) return p;
  } catch (_) {}
  return DEFAULT_PRODUCTS[productId] || null;
}

function buildShopPanel(guildId) {
  const products = getProducts(guildId);

  if (products.length === 0) {
    return {
      embeds: [new EmbedBuilder().setColor(0xe91e8c).setTitle("🛒 Panel de Compras").setDescription("Todavía no hay productos a la venta.")],
      components: []
    };
  }

  const embed = new EmbedBuilder()
    .setColor(0xe91e8c)
    .setTitle("🛒 Panel de Compras y Servicios — Ceitus Store")
    .setDescription(
      "Seleccioná cualquier producto o servicio en el menú de abajo para ver sus detalles, precio y comprar de forma privada.\n\n" +
      "📌 **Todo en un solo lugar:** cuentas de streaming, optimizaciones para tu PC o teléfono, bots y más."
    )
    .setFooter({ text: "Ceitus Store — Seleccioná una opción para ver detalles" });

  const options = products.slice(0, 25).map((p) => ({
    label: p.name.slice(0, 100),
    description: `${p.category} · ${p.price}`.slice(0, 100),
    value: String(p.id)
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId("shop_buy_select")
    .setPlaceholder("Elegí qué comprar...")
    .addOptions(options);

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] };
}

function buildProductDetailPanel(product) {
  const embed = new EmbedBuilder()
    .setColor(0xe91e8c)
    .setTitle(`🛒 ${product.name}`)
    .setDescription(
      (product.description ? `${product.description}\n\n` : "") +
      `**Precio:** \`${product.price}\`\n` +
      `**Categoría:** \`${product.category}\`\n\n` +
      "💳 **Métodos de pago aceptados:**\n" +
      "• 🇦🇷 **Mercado Pago** (Transferencia directa / Alias / CVU — 0% recargo)\n" +
      "• 🇺🇾 **Prex** / Giro local\n" +
      "• 🌎 **PayPal** (USD)\n" +
      "• 🇵🇪 **Yape** / Astropay\n\n" +
      "🔒 *Este panel lo ves solo vos. Si querés comprar este producto, hacé clic en el botón de abajo para iniciar tu orden y abrir tu ticket privado.*"
    )
    .setFooter({ text: "Ceitus Store — Solo visible para vos" })
    .setTimestamp();

  if (product.image_url) {
    embed.setImage(product.image_url);
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`shop_confirm_buy:${product.id}`)
      .setLabel("Comprar ahora")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🛒"),
    new ButtonBuilder()
      .setCustomId("shop_cancel_ephemeral")
      .setLabel("Cerrar")
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

module.exports = { getProducts, getProductById, buildShopPanel, buildProductDetailPanel };
