const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("moneda").setDescription("Tira una moneda: cara o cruz"),

  async execute(interaction) {
    const resultado = Math.random() < 0.5 ? "🪙 Cara" : "🪙 Cruz";
    return interaction.reply({ content: `${resultado}` });
  }
};
