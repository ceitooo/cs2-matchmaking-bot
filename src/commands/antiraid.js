const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { getGuildSettings, updateGuildSettings } = require("../db/database");
const { isCeitoOrDeveloper } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("antiraid")
    .setDescription("Configura la protección anti-raid (banea a quien agregue bots no autorizados)")
    .addSubcommand((sub) => sub.setName("activar").setDescription("Activa la protección anti-raid"))
    .addSubcommand((sub) => sub.setName("desactivar").setDescription("Desactiva la protección anti-raid"))
    .addSubcommand((sub) => sub.setName("estado").setDescription("Muestra el estado actual de la protección"))
    .addSubcommand((sub) =>
      sub
        .setName("canal-logs")
        .setDescription("Define el canal donde se reportan las acciones del anti-raid")
        .addChannelOption((opt) =>
          opt
            .setName("canal")
            .setDescription("Canal de texto para los logs")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    if (!isCeitoOrDeveloper(interaction)) {
      return interaction.reply({ content: "❌ Solo el rol Ceito o Developer puede usar este comando.", flags: 64 });
    }

    const sub = interaction.options.getSubcommand();
    const settings = getGuildSettings(interaction.guild.id);

    if (sub === "activar") {
      updateGuildSettings(interaction.guild.id, { antiraid_enabled: 1 });
      return interaction.reply({ content: "🛡️ Anti-raid **activado**.", flags: 64 });
    }

    if (sub === "desactivar") {
      updateGuildSettings(interaction.guild.id, { antiraid_enabled: 0 });
      return interaction.reply({ content: "⚠️ Anti-raid **desactivado**.", flags: 64 });
    }

    if (sub === "estado") {
      const estado = settings.antiraid_enabled ? "🟢 Activado" : "🔴 Desactivado";
      const canal = settings.antiraid_log_channel_id ? `<#${settings.antiraid_log_channel_id}>` : "No configurado (usa el canal de bienvenida si existe)";
      return interaction.reply({ content: `**Estado del anti-raid:** ${estado}\n**Canal de logs:** ${canal}`, flags: 64 });
    }

    if (sub === "canal-logs") {
      const canal = interaction.options.getChannel("canal");
      updateGuildSettings(interaction.guild.id, { antiraid_log_channel_id: canal.id });
      return interaction.reply({ content: `📋 Canal de logs de anti-raid establecido en ${canal}.`, flags: 64 });
    }
  }
};
