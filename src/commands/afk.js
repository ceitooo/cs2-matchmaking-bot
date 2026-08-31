const { SlashCommandBuilder } = require("discord.js");
const { setAfk } = require("../db/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Te marca como AFK — si te mencionan, el bot avisa tu motivo")
    .addStringOption((o) => o.setName("motivo").setDescription("Por qué estás AFK").setRequired(false)),

  async execute(interaction) {
    const reason = interaction.options.getString("motivo")?.trim() || "AFK";
    setAfk(interaction.guild.id, interaction.user.id, reason);
    return interaction.reply({ content: `💤 ${interaction.user} ahora está AFK. Motivo: **${reason}**` });
  }
};
