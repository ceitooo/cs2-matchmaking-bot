const { SlashCommandBuilder, ChannelType, EmbedBuilder } = require("discord.js");
const { getGuildSettings, updateGuildSettings } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("boost")
    .setDescription("Configura el anuncio de boosts del servidor (solo staff o ceito)")
    .addSubcommand((sub) => sub.setName("canal").setDescription("Define el canal de anuncios de boost").addChannelOption((opt) =>
      opt.setName("canal").setDescription("Canal donde se publicarán los boosts").addChannelTypes(ChannelType.GuildText).setRequired(true)
    ))
    .addSubcommand((sub) =>
      sub
        .setName("imagen")
        .setDescription("Define la imagen o gif del anuncio de boost")
        .addAttachmentOption((opt) => opt.setName("archivo").setDescription("Imagen o gif a usar").setRequired(false))
        .addStringOption((opt) => opt.setName("url").setDescription("URL de una imagen o gif (alternativa al archivo)").setRequired(false))
    )
    .addSubcommand((sub) => sub.setName("quitar-imagen").setDescription("Elimina la imagen/gif de boost configurada"))
    .addSubcommand((sub) =>
      sub
        .setName("color")
        .setDescription("Define el color del panel de boost")
        .addStringOption((opt) => opt.setName("hex").setDescription("Color en hexadecimal (ej: #f47fff)").setRequired(true))
    )
    .addSubcommand((sub) => sub.setName("ver").setDescription("Muestra la configuración actual de boost")),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "Solo el staff o ceito pueden usar este comando.", flags: 64 });
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === "canal") {
      const channel = interaction.options.getChannel("canal", true);
      updateGuildSettings(guildId, { boost_channel_id: channel.id });
      return interaction.reply({ content: `✅ Canal de boosts configurado en ${channel}.`, flags: 64 });
    }

    if (sub === "imagen") {
      const attachment = interaction.options.getAttachment("archivo");
      const url = interaction.options.getString("url");
      const imageUrl = attachment?.url || url;

      if (!imageUrl) {
        return interaction.reply({ content: "Debes adjuntar un archivo o pasar una URL.", flags: 64 });
      }

      updateGuildSettings(guildId, { boost_image_url: imageUrl });
      return interaction.reply({ content: "✅ Imagen/gif de boost actualizada.", flags: 64 });
    }

    if (sub === "quitar-imagen") {
      updateGuildSettings(guildId, { boost_image_url: null });
      return interaction.reply({ content: "✅ Imagen/gif de boost eliminada.", flags: 64 });
    }

    if (sub === "color") {
      const hex = interaction.options.getString("hex", true).trim();
      if (!/^#?[0-9a-fA-F]{6}$/.test(hex)) {
        return interaction.reply({ content: "Ese no es un color hexadecimal válido. Ejemplo: `#f47fff`.", flags: 64 });
      }
      const normalized = hex.startsWith("#") ? hex : `#${hex}`;
      updateGuildSettings(guildId, { boost_color: normalized });
      return interaction.reply({ content: `✅ Color de boost actualizado a \`${normalized}\`.`, flags: 64 });
    }

    if (sub === "ver") {
      const settings = getGuildSettings(guildId);
      const embed = new EmbedBuilder()
        .setTitle("Configuración de anuncio de boost")
        .setColor(settings.boost_color ?? 0xf47fff)
        .addFields(
          { name: "Canal", value: settings.boost_channel_id ? `<#${settings.boost_channel_id}>` : "No configurado" },
          { name: "Imagen/gif", value: settings.boost_image_url ? "Configurada (vista previa abajo)" : "No configurada" },
          { name: "Color", value: settings.boost_color ?? "Por defecto (`#f47fff`)" }
        );
      if (settings.boost_image_url) embed.setImage(settings.boost_image_url);
      return interaction.reply({ embeds: [embed], flags: 64 });
    }
  }
};
