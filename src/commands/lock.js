const { SlashCommandBuilder } = require("discord.js");
const { isStaffOrCeito } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder().setName("lock").setDescription("Bloquea este canal para que @everyone no pueda escribir (solo staff o ceito)"),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, { SendMessages: false }).catch(() => {});
    return interaction.reply({ content: "🔒 Canal bloqueado. Usa `/unlock` para reabrirlo." });
  }
};
