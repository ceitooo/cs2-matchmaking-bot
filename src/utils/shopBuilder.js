const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const { db } = require("../db/database");

function getProducts(guildId) {
  return db.prepare("SELECT * FROM shop_products WHERE guild_id = ? ORDER BY category ASC, position ASC, id ASC").all(guildId);
}

function buildShopPanel(guildId) {
  const products = getProducts(guildId);

  if (products.length === 0) {
    return {
      embeds: [new EmbedBuilder().setColor(0xe91e8c).setTitle("🛒 Panel de Compras").setDescription("Todavía no hay productos a la venta.")],
      components: []
    };
  }

  const embed = new EmbedBuilder().setColor(0xe91e8c).setTitle("🛒 Panel de Compras");

  const options = products.slice(0, 25).map((p) => ({
    label: p.name.slice(0, 100),
    description: `${p.category} · ${p.price}`.slice(0, 100),
    value: String(p.id)
  }));

  const select = new StringSelectMenuBuilder().setCustomId("shop_buy_select").setPlaceholder("Elegí qué comprar...").addOptions(options);

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] };
}

module.exports = { getProducts, buildShopPanel };
