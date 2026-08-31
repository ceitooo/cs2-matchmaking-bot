const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dado")
    .setDescription("Tira un dado")
    .addIntegerOption((o) => o.setName("caras").setDescription("Cantidad de caras (default 6)").setRequired(false).setMinValue(2).setMaxValue(1000)),

  async execute(interaction) {
    const caras = interaction.options.getInteger("caras") ?? 6;
    const resultado = Math.floor(Math.random() * caras) + 1;
    return interaction.reply({ content: `🎲 Salió **${resultado}** (de 1 a ${caras}).` });
  }
};
