const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { db } = require("../db/database");

const DEFAULT_PRODUCTS = {
  1: {
    id: 1,
    name: "Netflix Premium (Perfil Propio)",
    category: "Streaming",
    price: "10.09 USD (Oficial: 21.99 USD)",
    description: "🍿 **Plan Premium 4K Ultra HD + HDR**\n\n" +
      "• Podés crear tu perfil y ponerle tu propio código PIN 🗳️\n" +
      "• Juegos, series y películas sin publicidad y sin límite\n" +
      "• Puedes ver contenido en 4 dispositivos compatibles a la vez\n" +
      "• Reproducción en 4K (Ultra HD) + HDR\n" +
      "• Puedes descargar contenido en 6 dispositivos compatibles a la vez\n" +
      "• Opción para agregar hasta 2 miembros extras que no vivan contigo\n" +
      "• Audio espacial de Netflix\n\n" +
      "📊 **Espacios disponibles:** 2/5\n" +
      "💵 **Página oficial:** 21.99 USD\n" +
      "🔥 **Mi precio:** 10.09 USD"
  },
  2: {
    id: 2,
    name: "Disney+ Premium (Perfil Propio)",
    category: "Streaming",
    price: "14.99 USD (Oficial: 31.99 USD)",
    description: "🏰 **Plan Premium 4K Ultra HD + HDR**\n\n" +
      "• Creá tu propio perfil y personalizalo a tu gusto\n" +
      "• Acceso a Disney, Pixar, Marvel, Star Wars, National Geographic y Star\n" +
      "• 🚫 Sin anuncios ni interrupciones\n" +
      "• 📺 Mira contenido en hasta 4 dispositivos al mismo tiempo\n" +
      "• ✨ Calidad 4K Ultra HD + HDR\n" +
      "• 🎧 Dolby Atmos y audio de alta calidad\n" +
      "• ⬇️ Descarga contenido para verlo sin conexión\n\n" +
      "📊 **Espacios disponibles:** 2/5\n" +
      "💵 **Precio oficial:** 31.99 USD\n" +
      "🔥 **Nuestro precio:** 14.99 USD"
  },
  3: {
    id: 3,
    name: "Comprar licencia CeitoTweaks",
    category: "CeitoTweaks",
    price: "Planes por tiempo y de por vida",
    description: "⚡ **CeitoTweaks Suite Gamer & Optimización PC**\n\n" +
      "• Desbloqueo total de +390 tweaks del sistema y optimizaciones competitivas\n" +
      "• **Modo Juego CeitoTweaks:** máxima prioridad de CPU/GPU y vaciado de RAM en espera\n" +
      "• **CeitoSound:** cancelación de ruido con IA y ecualizador paramétrico de 10 bandas\n" +
      "• **CeitoVIA:** generador y escalador de imágenes por IA local\n" +
      "• **CeitoAim:** torneos de puntería, duelos 1v1 y tabla global con rangos\n" +
      "• **Ceitotify Premium:** temas visuales exclusivos, extras y sin publicidad\n" +
      "• **Nube CeitoTweaks:** backups automáticos de tus configuraciones en la nube\n" +
      "• **Insignia ⭐ Premium dorada** y rol VIP en la comunidad"
  },
  4: {
    id: 4,
    name: "Boost de Server (14 Boosts - Nivel 3)",
    category: "Discord",
    price: "10 USD (1 mes)",
    description: "🚀 **14 Boosts para tu Servidor de Discord (Nivel 3)**\n\n" +
      "• Llevá tu servidor al **Nivel 3** de Discord con boosts reales durante todo el mes\n" +
      "• 🎙️ Calidad de audio de hasta 384 kbps\n" +
      "• 📁 Subida de archivos de hasta 100 MB para todos los miembros\n" +
      "• 😎 250 slots de emojis y 60 de stickers personalizados\n" +
      "• 🖼️ Banner del server animado, invitación personalizada y URL vanity\n" +
      "• 🎬 Transmisiones en vivo en 1080p 60fps\n" +
      "• 🏅 Rol e insignia de booster para quien boostea"
  },
  5: {
    id: 5,
    name: "Optimización Android",
    category: "Optimización",
    price: "5 USD",
    description: "📱 **La mejor aplicación de optimización premium para Android (+99% rendimiento)**\n\n" +
      "• 🚀 CPU Boost y desbloqueo de rendimiento\n" +
      "• 🚀 Liberador de memoria RAM en segundo plano\n" +
      "• 🚀 Optimización de batería y temperaturas\n" +
      "• 🚀 Máxima fluidez y estabilidad de FPS en juegos (Free Fire, Warzone, CoD Mobile)\n\n" +
      "💰 **Precio:** 5 USD"
  },
  6: {
    id: 6,
    name: "Optimización iOS",
    category: "Optimización",
    price: "2 USD",
    description: "🍏 **Optimización y liberación de memoria RAM para iPhone / iPad**\n\n" +
      "• Liberación de memoria RAM para mayor fluidez del sistema operativo\n" +
      "• Reducción de cierres inesperados y mejor respuesta táctil en juegos\n" +
      "• Ajustes y optimización directa\n\n" +
      "💰 **Precio:** 2 USD"
  },
  7: {
    id: 7,
    name: "Spoof de componentes",
    category: "Optimización",
    price: "15 USD",
    description: "🔧 **Renovación y cambio de identificadores de PC**\n\n" +
      "• Configuración y renovación de identificadores de hardware en tu equipo para mantenimiento o pruebas\n" +
      "• Proceso rápido y compatible con múltiples arquitecturas de PC\n" +
      "• ⚠️ **Requisito obligatorio:** El equipo debe ser reinstalado de fábrica (instalación limpia de Windows)\n\n" +
      "💰 **Precio:** 15 USD"
  },
  8: {
    id: 8,
    name: "Discord Decoraciones, Efectos y Marcos",
    category: "Discord",
    price: "$3.80 - $5.99 USD por Frame",
    description: "✨ **Decoraciones, efectos de avatar y marcos permanentes para Discord**\n\n" +
      "• 💎 Acceso de por vida: ¡tuyo para siempre!\n" +
      "• 🔗 Entrega rápida mediante **Gift Link directo** (sin necesidad de iniciar sesión ni dar contraseñas)\n" +
      "• ❌ **No se requiere Nitro**: funciona perfectamente sin suscripción a Nitro\n" +
      "• Frames nuevos, animaciones de avatar y placas decorativas\n\n" +
      "💰 **Precio:** $3.80 - $5.99 USD por Frame / Efecto"
  },
  9: {
    id: 9,
    name: "Desarrollo de Bot de Discord",
    category: "Discord",
    price: "A consultar según funciones",
    description: "🤖 **Bots Profesionales y Personalizados de Discord**\n\n" +
      "• Moderación automática, filtros, anti-raid y protección anti-bots\n" +
      "• Sistemas de niveles, XP, juegos, apuestas, logs y auto-respuestas interactivas\n" +
      "• Sistema de música en alta fidelidad y canales dedicados\n" +
      "• Notificaciones automáticas de redes sociales (YouTube, Twitch, Kick, TikTok)\n" +
      "• Personalización completa: avatar, banner, nombre y branding de tu servidor\n" +
      "• Opciones de hosting 24/7 y mantenimiento incluidos"
  },
  10: {
    id: 10,
    name: "Creación de Servidores Discord",
    category: "Discord",
    price: "Negociable según requerimientos",
    description: "🛠️ **Servicio Profesional de Creación de Servidores desde 0**\n\n" +
      "• Personalización completa del servidor adaptada a tu temática o comunidad\n" +
      "• Estructura organizada de canales y roles estéticos\n" +
      "• Métodos de seguridad avanzados y sistemas anti-raid\n" +
      "• Configuración de bots esenciales y auto-respuestas\n" +
      "• Roles, canales y permisos asegurados profesionalmente\n\n" +
      "💰 **Precio:** Negociable según el nivel de personalización que necesites"
  },
  11: {
    id: 11,
    name: "Números Virtuales Verificados",
    category: "Otros",
    price: "Desde $4.000 ARS",
    description: "💎 **Números Virtuales Verificados y Funcionales**\n\n" +
      "• Ideales para activaciones, registros y validaciones (WhatsApp, Telegram, Discord, etc.)\n" +
      "• Países disponibles: Argentina, Chile, Colombia, Brasil, USA, México, Perú, Uruguay, Japón y más\n" +
      "• Servicio confiable, rápido y con atención personalizada\n\n" +
      "💰 **Precios en ARS:** desde $4.000 ARS según el país solicitado"
  }
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
      `📌 **Categoría:** \`${product.category}\`\n` +
      `💵 **Precio:** \`${product.price}\`\n\n` +
      "💳 **Métodos de pago aceptados:**\n" +
      "• 🇦🇷 **Mercado Pago** (Transferencia directa / Alias / CVU — 0% recargo)\n" +
      "• 🇺🇾 **Prex** / Giro local\n" +
      "• 🌎 **PayPal** (USD)\n" +
      "• 🇵🇪 **Yape** / Astropay / Binance USDT\n\n" +
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
