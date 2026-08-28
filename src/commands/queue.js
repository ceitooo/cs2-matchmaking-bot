const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getGuildPlayer } = require("../music/player");
const { MUSIC_CHANNEL_ID } = require("../music/panel");

module.exports = {
  data: new SlashCommandBuilder().setName("queue").setDescription("Muestra la cola de canciones"),
  async execute(interaction) {
    if (interaction.channelId !== MUSIC_CHANNEL_ID) {
      return interaction.reply({ content: `Este comando solo se puede usar en <#${MUSIC_CHANNEL_ID}>.`, flags: 64 });
    }

    const state = getGuildPlayer(interaction.guildId);
    if (!state?.current) return interaction.reply({ content: "No hay nada sonando.", flags: 64 });

    const embed = new EmbedBuilder()
      .setColor(0x1db954)
      .setTitle("🎵 Cola de reproducción")
      .setDescription(`**Sonando ahora:** ${state.current.title}`)
      .addFields({
        name: `En cola (${state.queue.length})`,
        value: state.queue.length ? state.queue.map((t, i) => `${i + 1}. ${t.title}`).join("\n").slice(0, 4000) : "_Vacía_"
      });

    await interaction.reply({ embeds: [embed], flags: 64 });
  }
};
