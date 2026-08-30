const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { getGuildSettings, updateGuildSettings } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");
const { postForGuild } = require("../schedulers/wallpaperScheduler");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wallpapers")
    .setDescription("Configura los canales de posteo automático de wallpapers/banners/iconos")
    .addSubcommand((sub) =>
      sub
        .setName("canal-pc")
        .setDescription("Canal para wallpapers de PC (16:9)")
        .addChannelOption((o) => o.setName("canal").setDescription("Canal").addChannelTypes(ChannelType.GuildText).setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("canal-movil")
        .setDescription("Canal para wallpapers de celular (9:16)")
        .addChannelOption((o) => o.setName("canal").setDescription("Canal").addChannelTypes(ChannelType.GuildText).setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("canal-banner")
        .setDescription("Canal para banners anime (16:9)")
        .addChannelOption((o) => o.setName("canal").setDescription("Canal").addChannelTypes(ChannelType.GuildText).setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("canal-icono")
        .setDescription("Canal para iconos anime (1:1)")
        .addChannelOption((o) => o.setName("canal").setDescription("Canal").addChannelTypes(ChannelType.GuildText).setRequired(true))
    )
    .addSubcommand((sub) => sub.setName("ahora").setDescription("Postea ahora mismo en todos los canales configurados"))
    .addSubcommand((sub) => sub.setName("estado").setDescription("Muestra la configuración actual")),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    const sub = interaction.options.getSubcommand();
    const settings = getGuildSettings(interaction.guild.id);

    if (sub === "canal-pc") {
      const canal = interaction.options.getChannel("canal");
      updateGuildSettings(interaction.guild.id, { wallpaper_pc_channel_id: canal.id });
      return interaction.reply({ content: `🖥️ Canal de wallpapers PC establecido en ${canal}.`, flags: 64 });
    }

    if (sub === "canal-movil") {
      const canal = interaction.options.getChannel("canal");
      updateGuildSettings(interaction.guild.id, { wallpaper_mobile_channel_id: canal.id });
      return interaction.reply({ content: `📱 Canal de wallpapers móvil establecido en ${canal}.`, flags: 64 });
    }

    if (sub === "canal-banner") {
      const canal = interaction.options.getChannel("canal");
      updateGuildSettings(interaction.guild.id, { banner_channel_id: canal.id });
      return interaction.reply({ content: `🎌 Canal de banners establecido en ${canal}.`, flags: 64 });
    }

    if (sub === "canal-icono") {
      const canal = interaction.options.getChannel("canal");
      updateGuildSettings(interaction.guild.id, { icon_channel_id: canal.id });
      return interaction.reply({ content: `🎌 Canal de iconos establecido en ${canal}.`, flags: 64 });
    }

    if (sub === "estado") {
      const c = (id) => (id ? `<#${id}>` : "No configurado");
      return interaction.reply({
        content:
          `**Configuración de posteo automático:**\n` +
          `🖥️ PC: ${c(settings.wallpaper_pc_channel_id)}\n` +
          `📱 Móvil: ${c(settings.wallpaper_mobile_channel_id)}\n` +
          `🎌 Banner: ${c(settings.banner_channel_id)}\n` +
          `🎌 Icono: ${c(settings.icon_channel_id)}`,
        flags: 64
      });
    }

    if (sub === "ahora") {
      await interaction.deferReply({ flags: 64 });
      await postForGuild(interaction.client, settings);
      return interaction.editReply({ content: "✅ Posteado en los canales configurados." });
    }
  }
};
