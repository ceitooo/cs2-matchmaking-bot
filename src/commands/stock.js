const { SlashCommandBuilder, ChannelType, EmbedBuilder } = require("discord.js");
const { getStockOverview, setResourceRequirement, clearStock, getGuildSettings, updateGuildSettings, getKeysByResource } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");

function buildStockPanel(guildId) {
  const resources = getStockOverview(guildId);

  const embed = new EmbedBuilder()
    .setTitle("📦 Stock disponible por invitaciones")
    .setColor(0x2ecc71)
    .setDescription(
      resources.length > 0
        ? "Estos son los recursos que podés ganar invitando gente al server. Cuando cumplas el requisito, el bot te va a escribir por DM para que elijas cuál querés."
        : "Todavía no hay stock cargado."
    )
    .setTimestamp();

  for (const r of resources) {
    embed.addFields({
      name: r.resource,
      value: `Stock: **${r.stock}**\nRequisito: ${r.requirement ?? "5 invitaciones"}`,
      inline: true
    });
  }

  return { embeds: [embed] };
}

async function refreshStockPanel(client, guildId) {
  const settings = getGuildSettings(guildId);
  if (!settings.stock_panel_channel_id || !settings.stock_panel_message_id) return;

  const channel = await client.channels.fetch(settings.stock_panel_channel_id).catch(() => null);
  if (!channel?.isTextBased()) return;

  const message = await channel.messages.fetch(settings.stock_panel_message_id).catch(() => null);
  if (!message) return;

  await message.edit(buildStockPanel(guildId)).catch(() => {});
}

module.exports = {
  buildStockPanel,
  refreshStockPanel,
  data: new SlashCommandBuilder()
    .setName("stock")
    .setDescription("Administra el panel público de stock (solo staff o ceito)")
    .addSubcommand((sub) =>
      sub
        .setName("publicar")
        .setDescription("Publica o actualiza el panel de stock en un canal")
        .addChannelOption((opt) => opt.setName("canal").setDescription("Canal donde se publica el panel").addChannelTypes(ChannelType.GuildText).setRequired(true))
    )
    .addSubcommand((sub) => sub.setName("actualizar").setDescription("Actualiza el panel ya publicado con el stock actual"))
    .addSubcommand((sub) =>
      sub
        .setName("requisito")
        .setDescription("Cambia el texto de requisito que se muestra para un recurso")
        .addStringOption((o) => o.setName("recurso").setDescription("Nombre exacto del recurso (ej: Ceitus Roblox)").setRequired(true))
        .addStringOption((o) => o.setName("texto").setDescription("Requisito a mostrar (ej: 10 invitaciones)").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("quitar")
        .setDescription("Borra todo el stock restante de un recurso")
        .addStringOption((o) => o.setName("recurso").setDescription("Nombre exacto del recurso").setRequired(true))
    )
    .addSubcommand((sub) => sub.setName("listar").setDescription("Lista el stock actual con sus requisitos"))
    .addSubcommand((sub) =>
      sub
        .setName("verkeys")
        .setDescription("Muestra todas las keys de un recurso (usadas y sin usar)")
        .addStringOption((o) => o.setName("recurso").setDescription("Nombre exacto del recurso (ej: Ceitus Roblox)").setRequired(true))
    ),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === "publicar" || sub === "actualizar") {
      const settings = getGuildSettings(guildId);
      const channel = sub === "publicar" ? interaction.options.getChannel("canal", true) : await interaction.guild.channels.fetch(settings.stock_panel_channel_id).catch(() => null);

      if (!channel) {
        return interaction.reply({ content: "❌ Todavía no hay un panel publicado. Usá `/stock publicar` primero.", flags: 64 });
      }

      const payload = buildStockPanel(guildId);

      let message = null;
      if (settings.stock_panel_channel_id === channel.id && settings.stock_panel_message_id) {
        message = await channel.messages.fetch(settings.stock_panel_message_id).catch(() => null);
      }

      if (message) {
        const edited = await message.edit(payload).catch(() => null);
        if (!edited) message = null;
      }

      if (!message) {
        message = await channel.send(payload);
        updateGuildSettings(guildId, { stock_panel_channel_id: channel.id, stock_panel_message_id: message.id });
      }

      return interaction.reply({ content: `✅ Panel de stock publicado/actualizado en ${channel}.`, flags: 64 });
    }

    if (sub === "requisito") {
      const recurso = interaction.options.getString("recurso", true).trim();
      const texto = interaction.options.getString("texto", true).trim();
      setResourceRequirement(guildId, recurso, texto);
      return interaction.reply({ content: `✅ Requisito de **${recurso}** actualizado a: ${texto}. Usá \`/stock actualizar\` para reflejarlo en el panel.`, flags: 64 });
    }

    if (sub === "quitar") {
      const recurso = interaction.options.getString("recurso", true).trim();
      const removed = clearStock(guildId, recurso);
      return interaction.reply({ content: `✅ Se borraron ${removed} key(s) restantes de **${recurso}**. Usá \`/stock actualizar\` para reflejarlo en el panel.`, flags: 64 });
    }

    if (sub === "listar") {
      const resources = getStockOverview(guildId);
      if (resources.length === 0) {
        return interaction.reply({ content: "No hay stock cargado.", flags: 64 });
      }
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("Stock actual")
        .setDescription(resources.map((r) => `**${r.resource}** — stock: ${r.stock} — requisito: ${r.requirement ?? "5 invitaciones"}`).join("\n"));
      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    if (sub === "verkeys") {
      const recurso = interaction.options.getString("recurso", true).trim();
      const keys = getKeysByResource(guildId, recurso);
      if (keys.length === 0) {
        return interaction.reply({ content: `No hay keys cargadas para **${recurso}**.`, flags: 64 });
      }
      const libres   = keys.filter((k) => !k.used);
      const usadas   = keys.filter((k) => k.used);
      const libresTxt = libres.length  ? libres.map((k) => `\`${k.key_value}\``).join("\n")  : "_ninguna_";
      const usadasTxt = usadas.length  ? usadas.map((k) => `\`${k.key_value}\``).join("\n")  : "_ninguna_";
      const embed = new EmbedBuilder()
        .setTitle(`🔑 Keys de ${recurso}`)
        .setColor(0x5865f2)
        .addFields(
          { name: `✅ Sin usar (${libres.length})`,  value: libresTxt.slice(0, 1024) },
          { name: `❌ Usadas (${usadas.length})`,    value: usadasTxt.slice(0, 1024) }
        );
      return interaction.reply({ embeds: [embed], flags: 64 });
    }
  }
};
