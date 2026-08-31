const { SlashCommandBuilder } = require("discord.js");
const { isStaffOrCeito } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription("Pone modo lento en este canal (solo staff o ceito)")
    .addIntegerOption((o) => o.setName("segundos").setDescription("Segundos entre mensajes (0 para desactivar)").setRequired(true).setMinValue(0).setMaxValue(21600)),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    const segundos = interaction.options.getInteger("segundos");
    await interaction.channel.setRateLimitPerUser(segundos).catch(() => {});

    return interaction.reply({
      content: segundos === 0 ? "✅ Modo lento desactivado." : `🐌 Modo lento: **${segundos}s** entre mensajes.`
    });
  }
};
