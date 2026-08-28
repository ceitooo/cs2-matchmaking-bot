const { SlashCommandBuilder } = require("discord.js");
const { createQuickQueue } = require("../utils/quickQueue");

module.exports = {
  data: new SlashCommandBuilder().setName("duo").setDescription("Crea una cola rápida para jugar en Dúo (2 jugadores)"),
  async execute(interaction) {
    await createQuickQueue(interaction, "duo");
  }
};
