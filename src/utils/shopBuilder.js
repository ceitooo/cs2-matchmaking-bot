const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const { db } = require("../db/database");

function getProducts(guildId) {
  return db.prepare("SELECT * FROM shop_products WHERE guild_id = ? ORDER BY category ASC, position ASC, id ASC").all(guildId);
}

function buildShopPanel(guildId) {
  const products = getProducts(guildId);

  if (products.length === 0) {
    return {
      embeds: [new EmbedBuilder().setColor(0xe91e8c).setTitle("🛒 Tienda").setDescription("Todavía no hay productos a la venta.")],
      components: []
    };
  }

  const categories = [...new Set(products.map((p) => p.category))];

  const embed = new EmbedBuilder().setColor(0xe91e8c).setTitle("🛒 Tienda").setDescription("Elegí un producto del menú de abajo para comprarlo.");

  for (const category of categories) {
    const items = products.filter((p) => p.category === category);
    const value = items.map((p) => `**${p.name}** — ${p.price}${p.description ? `\n${p.description}` : ""}`).join("\n\n");
    embed.addFields({ name: `📦 ${category}`, value: value.slice(0, 1024) });
  }

  const firstImage = products.find((p) => p.image_url)?.image_url;
  if (firstImage) embed.setThumbnail(firstImage);

  const options = products.slice(0, 25).map((p) => ({
    label: p.name.slice(0, 100),
    description: `${p.category} · ${p.price}`.slice(0, 100),
    value: String(p.id)
  }));

  const select = new StringSelectMenuBuilder().setCustomId("shop_buy_select").setPlaceholder("Elegí qué comprar...").addOptions(options);

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] };
}

module.exports = { getProducts, buildShopPanel };
