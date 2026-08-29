const { SlashCommandBuilder, ChannelType, EmbedBuilder } = require("discord.js");
const { getGuildSettings, updateGuildSettings } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");
const { buildWelcomeMessage } = require("../utils/welcomeBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bienvenida")
    .setDescription("Configura el mensaje de bienvenida (solo staff o ceito)")
    .addSubcommand((sub) => sub.setName("canal").setDescription("Define el canal de bienvenidas").addChannelOption((opt) =>
      opt.setName("canal").setDescription("Canal donde se publicarán las bienvenidas").addChannelTypes(ChannelType.GuildText).setRequired(true)
    ))
    .addSubcommand((sub) =>
      sub
        .setName("imagen")
        .setDescription("Define la imagen o gif de bienvenida")
        .addAttachmentOption((opt) => opt.setName("archivo").setDescription("Imagen o gif a usar").setRequired(false))
        .addStringOption((opt) => opt.setName("url").setDescription("URL de una imagen o gif (alternativa al archivo)").setRequired(false))
    )
    .addSubcommand((sub) => sub.setName("quitar-imagen").setDescription("Elimina la imagen/gif de bienvenida configurada"))
    .addSubcommand((sub) =>
      sub
        .setName("color")
        .setDescription("Define el color del panel de bienvenida")
        .addStringOption((opt) => opt.setName("hex").setDescription("Color en hexadecimal (ej: #e91e8c)").setRequired(true))
    )
    .addSubcommand((sub) => sub.setName("ver").setDescription("Muestra la configuración actual de bienvenida")),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "Solo el staff o ceito pueden usar este comando.", flags: 64 });
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === "canal") {
      const channel = interaction.options.getChannel("canal", true);
      updateGuildSettings(guildId, { welcome_channel_id: channel.id });
      return interaction.reply({ content: `✅ Canal de bienvenidas configurado en ${channel}.`, flags: 64 });
    }

    if (sub === "imagen") {
      const attachment = interaction.options.getAttachment("archivo");
      const url = interaction.options.getString("url");
      const imageUrl = attachment?.url || url;

      if (!imageUrl) {
        return interaction.reply({ content: "Debes adjuntar un archivo o pasar una URL.", flags: 64 });
      }

      updateGuildSettings(guildId, { welcome_image_url: imageUrl });
      return interaction.reply({ content: "✅ Imagen/gif de bienvenida actualizada.", flags: 64 });
    }

    if (sub === "quitar-imagen") {
      updateGuildSettings(guildId, { welcome_image_url: null });
      return interaction.reply({ content: "✅ Imagen/gif de bienvenida eliminada.", flags: 64 });
    }

    if (sub === "color") {
      const hex = interaction.options.getString("hex", true).trim();
      if (!/^#?[0-9a-fA-F]{6}$/.test(hex)) {
        return interaction.reply({ content: "Ese no es un color hexadecimal válido. Ejemplo: `#e91e8c`.", flags: 64 });
      }
      const normalized = hex.startsWith("#") ? hex : `#${hex}`;
      updateGuildSettings(guildId, { welcome_color: normalized });
      return interaction.reply({ content: `✅ Color de bienvenida actualizado a \`${normalized}\`.`, flags: 64 });
    }

    if (sub === "ver") {
      const settings = getGuildSettings(guildId);
      const embed = new EmbedBuilder()
        .setTitle("Configuración de bienvenida")
        .setColor(settings.welcome_color ?? 0xe91e8c)
        .addFields(
          { name: "Canal", value: settings.welcome_channel_id ? `<#${settings.welcome_channel_id}>` : "No configurado" },
          { name: "Imagen/gif", value: settings.welcome_image_url ? "Configurada (vista previa abajo)" : "No configurada" },
          { name: "Color", value: settings.welcome_color ?? "Por defecto (`#e91e8c`)" }
        );
      if (settings.welcome_image_url) embed.setImage(settings.welcome_image_url);

      if (settings.welcome_channel_id) {
        const preview = buildWelcomeMessage(interaction.member ?? interaction.user, interaction.guild, settings);
        return interaction.reply({ embeds: [embed], flags: 64 }).then(() => interaction.followUp({ ...preview, flags: 64 }));
      }
      return interaction.reply({ embeds: [embed], flags: 64 });
    }
  }
};
