const { SlashCommandBuilder } = require("discord.js");
const { getGuildPlayer } = require("../music/player");
const { MUSIC_CHANNEL_ID, refreshMusicPanel } = require("../music/panel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Configura la repetición")
    .addStringOption((opt) =>
      opt
        .setName("modo")
        .setDescription("Qué repetir")
        .setRequired(true)
        .addChoices({ name: "Desactivado", value: "off" }, { name: "Canción actual", value: "track" }, { name: "Toda la cola", value: "queue" })
    ),

  async execute(interaction) {
    if (interaction.channelId !== MUSIC_CHANNEL_ID) {
      return interaction.reply({ content: `Este comando solo se puede usar en <#${MUSIC_CHANNEL_ID}>.`, flags: 64 });
    }

    const state = getGuildPlayer(interaction.guildId);
    if (!state) return interaction.reply({ content: "No hay nada reproduciéndose.", flags: 64 });

    state.loop = interaction.options.getString("modo");

    const labels = { off: "desactivado", track: "canción actual", queue: "toda la cola" };
    await interaction.reply(`🔁 Loop: ${labels[state.loop]}.`);
    await refreshMusicPanel(interaction.guild);
  }
};
