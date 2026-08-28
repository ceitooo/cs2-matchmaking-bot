const { SlashCommandBuilder } = require("discord.js");
const { getGuildPlayer } = require("../music/player");
const { MUSIC_CHANNEL_ID, refreshMusicPanel } = require("../music/panel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("volumen")
    .setDescription("Ajusta el volumen (0-100)")
    .addIntegerOption((opt) => opt.setName("nivel").setDescription("0 a 100").setRequired(true).setMinValue(0).setMaxValue(100)),

  async execute(interaction) {
    if (interaction.channelId !== MUSIC_CHANNEL_ID) {
      return interaction.reply({ content: `Este comando solo se puede usar en <#${MUSIC_CHANNEL_ID}>.`, flags: 64 });
    }

    const state = getGuildPlayer(interaction.guildId);
    if (!state) return interaction.reply({ content: "No hay nada reproduciéndose.", flags: 64 });

    const nivel = interaction.options.getInteger("nivel");
    state.volume = nivel;
    state.resource?.volume?.setVolume(nivel / 100);

    await interaction.reply(`🔊 Volumen ajustado a ${nivel}%.`);
    await refreshMusicPanel(interaction.guild);
  }
};
