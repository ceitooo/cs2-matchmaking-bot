const { SlashCommandBuilder } = require("discord.js");
const { getGuildPlayer, skipTrack } = require("../music/player");
const { MUSIC_CHANNEL_ID } = require("../music/panel");

module.exports = {
  data: new SlashCommandBuilder().setName("skip").setDescription("Salta a la siguiente canción"),
  async execute(interaction) {
    if (interaction.channelId !== MUSIC_CHANNEL_ID) {
      return interaction.reply({ content: `Este comando solo se puede usar en <#${MUSIC_CHANNEL_ID}>.`, flags: 64 });
    }

    const state = getGuildPlayer(interaction.guildId);
    if (!state?.current) return interaction.reply({ content: "No hay nada sonando ahora mismo.", flags: 64 });

    const skipped = state.current.title;
    skipTrack(state);
    await interaction.reply(`⏭️ Saltando **${skipped}**.`);
  }
};
