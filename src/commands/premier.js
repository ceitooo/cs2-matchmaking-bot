const { SlashCommandBuilder } = require("discord.js");
const { createQuickQueue } = require("../utils/quickQueue");

module.exports = {
  data: new SlashCommandBuilder().setName("premier").setDescription("Crea una cola rápida para jugar Premier (5 jugadores)"),
  async execute(interaction) {
    await createQuickQueue(interaction, "premier");
  }
};
