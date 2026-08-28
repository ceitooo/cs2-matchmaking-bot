const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { buildQueuePanel } = require("../utils/panelBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Publica el panel de matchmaking en este canal")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const panel = buildQueuePanel();
    await interaction.reply(panel);
  }
};
