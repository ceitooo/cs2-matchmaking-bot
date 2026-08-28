const { SlashCommandBuilder } = require("discord.js");
const { createQuickQueue } = require("../utils/quickQueue");

module.exports = {
  data: new SlashCommandBuilder().setName("compe").setDescription("Crea una cola rápida para jugar Competitivo (5 jugadores)"),
  async execute(interaction) {
    await createQuickQueue(interaction, "compe");
  }
};
