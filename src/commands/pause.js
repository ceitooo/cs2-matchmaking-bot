const { SlashCommandBuilder } = require("discord.js");
const { getGuildPlayer } = require("../music/player");
const { MUSIC_CHANNEL_ID, refreshMusicPanel } = require("../music/panel");

module.exports = {
  data: new SlashCommandBuilder().setName("pause").setDescription("Pausa la reproducción"),
  async execute(interaction) {
    if (interaction.channelId !== MUSIC_CHANNEL_ID) {
      return interaction.reply({ content: `Este comando solo se puede usar en <#${MUSIC_CHANNEL_ID}>.`, flags: 64 });
    }

    const state = getGuildPlayer(interaction.guildId);
    if (!state?.current) return interaction.reply({ content: "No hay nada sonando ahora mismo.", flags: 64 });

    state.audioPlayer.pause();
    await interaction.reply("⏸️ Pausado.");
    await refreshMusicPanel(interaction.guild);
  }
};
