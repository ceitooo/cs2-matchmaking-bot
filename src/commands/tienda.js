const { SlashCommandBuilder, ChannelType, EmbedBuilder } = require("discord.js");
const { db, getGuildSettings, updateGuildSettings } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");
const { buildShopPanel, getProducts } = require("../utils/shopBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tienda")
    .setDescription("Administra el panel de productos en venta (solo staff o ceito)")
    .addSubcommand((sub) =>
      sub
        .setName("agregar")
        .setDescription("Agrega un producto a la tienda")
        .addStringOption((opt) => opt.setName("categoria").setDescription("Categoría del producto").setRequired(true))
        .addStringOption((opt) => opt.setName("nombre").setDescription("Nombre del producto").setRequired(true))
        .addStringOption((opt) => opt.setName("precio").setDescription("Precio (ej: $10, 5000 ARS)").setRequired(true))
        .addStringOption((opt) => opt.setName("descripcion").setDescription("Descripción del producto").setRequired(false))
        .addAttachmentOption((opt) => opt.setName("imagen").setDescription("Imagen del producto").setRequired(false))
        .addStringOption((opt) => opt.setName("imagen_url").setDescription("URL de imagen (alternativa al archivo)").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName("quitar")
        .setDescription("Quita un producto de la tienda")
        .addStringOption((opt) => opt.setName("producto").setDescription("Producto a quitar").setRequired(true).setAutocomplete(true))
    )
    .addSubcommand((sub) => sub.setName("listar").setDescription("Lista los productos actuales"))
    .addSubcommand((sub) =>
      sub
        .setName("publicar")
        .setDescription("Publica o actualiza el panel de la tienda en un canal")
        .addChannelOption((opt) => opt.setName("canal").setDescription("Canal donde se publica el panel").addChannelTypes(ChannelType.GuildText).setRequired(true))
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const products = getProducts(interaction.guildId);
    const matches = products
      .filter((p) => p.name.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((p) => ({ name: `${p.name} (${p.category})`, value: String(p.id) }));
    await interaction.respond(matches);
  },

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "Solo el staff o ceito pueden usar este comando.", flags: 64 });
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === "agregar") {
      const categoria = interaction.options.getString("categoria", true);
      const nombre = interaction.options.getString("nombre", true);
      const precio = interaction.options.getString("precio", true);
      const descripcion = interaction.options.getString("descripcion");
      const attachment = interaction.options.getAttachment("imagen");
      const imagenUrl = interaction.options.getString("imagen_url");

      db.prepare(
        "INSERT INTO shop_products (guild_id, category, name, price, description, image_url, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(guildId, categoria, nombre, precio, descripcion ?? null, attachment?.url || imagenUrl || null, 0, Date.now());

      return interaction.reply({ content: `✅ Producto **${nombre}** agregado en la categoría **${categoria}**. Usa \`/tienda publicar\` para actualizar el panel.`, flags: 64 });
    }

    if (sub === "quitar") {
      const productoId = interaction.options.getString("producto", true);
      const removed = db.prepare("DELETE FROM shop_products WHERE id = ? AND guild_id = ?").run(Number(productoId), guildId);
      if (removed.changes === 0) {
        return interaction.reply({ content: "No encontré ese producto.", flags: 64 });
      }
      return interaction.reply({ content: "✅ Producto quitado. Usa `/tienda publicar` para actualizar el panel.", flags: 64 });
    }

    if (sub === "listar") {
      const products = getProducts(guildId);
      if (products.length === 0) {
        return interaction.reply({ content: "No hay productos cargados.", flags: 64 });
      }
      const embed = new EmbedBuilder()
        .setColor(0xe91e8c)
        .setTitle("Productos cargados")
        .setDescription(products.map((p) => `\`${p.id}\` **${p.name}** — ${p.category} — ${p.price}`).join("\n").slice(0, 4000));
      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    if (sub === "publicar") {
      const channel = interaction.options.getChannel("canal", true);
      const payload = buildShopPanel(guildId);

      const settings = getGuildSettings(guildId);
      let message = null;
      if (settings.shop_panel_channel_id === channel.id && settings.shop_panel_message_id) {
        message = await channel.messages.fetch({ message: settings.shop_panel_message_id, force: true }).catch(() => null);
      }

      if (message) {
        const edited = await message.edit(payload).catch(() => null);
        if (!edited) message = null;
      }

      if (!message) {
        message = await channel.send(payload);
        updateGuildSettings(guildId, { shop_panel_channel_id: channel.id, shop_panel_message_id: message.id });
      }

      return interaction.reply({ content: `✅ Panel de tienda publicado/actualizado en ${channel}.`, flags: 64 });
    }
  }
};
