const { SlashCommandBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const { isStaffOrCeito } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("probarkey")
    .setDescription("Botón para previsualizar por DM cómo se ve la entrega de una key (con una key falsa)"),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    const button = new ButtonBuilder().setCustomId("test_key_dm").setLabel("🔑 Probar mensaje de key").setStyle(ButtonStyle.Primary);

    return interaction.reply({
      content: "Tocá el botón para recibir por DM una simulación del mensaje de premio (key de prueba, no funciona de verdad).",
      components: [new ActionRowBuilder().addComponents(button)],
      flags: 64
    });
  }
};
