const { SlashCommandBuilder } = require("discord.js");
const { getGuildPlayer, destroyGuildPlayer } = require("../music/player");
const { MUSIC_CHANNEL_ID, refreshMusicPanel } = require("../music/panel");

module.exports = {
  data: new SlashCommandBuilder().setName("stop").setDescription("Detiene la música, vacía la cola y sale del canal de voz"),
  async execute(interaction) {
    if (interaction.channelId !== MUSIC_CHANNEL_ID) {
      return interaction.reply({ content: `Este comando solo se puede usar en <#${MUSIC_CHANNEL_ID}>.`, flags: 64 });
    }

    const state = getGuildPlayer(interaction.guildId);
    if (!state) return interaction.reply({ content: "No hay nada reproduciéndose.", flags: 64 });

    destroyGuildPlayer(interaction.guildId);
    await interaction.reply("⏹️ Música detenida, cola vaciada.");
    await refreshMusicPanel(interaction.guild);
  }
};
