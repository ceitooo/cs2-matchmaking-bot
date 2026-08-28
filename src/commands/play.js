const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { resolveTrack } = require("../music/resolveTrack");
const { getGuildPlayer, createGuildPlayer, enqueue } = require("../music/player");
const { MUSIC_CHANNEL_ID, repostMusicPanel } = require("../music/panel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Reproduce una canción (YouTube, Spotify, o busca por nombre)")
    .addStringOption((opt) => opt.setName("cancion").setDescription("Link de YouTube/Spotify o nombre de la canción").setRequired(true)),

  async execute(interaction) {
    if (interaction.channelId !== MUSIC_CHANNEL_ID) {
      return interaction.reply({ content: `Este comando solo se puede usar en <#${MUSIC_CHANNEL_ID}>.`, flags: 64 });
    }

    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: "Tienes que estar en un canal de voz para usar esto.", flags: 64 });
    }

    await interaction.deferReply();

    const query = interaction.options.getString("cancion");

    let track;
    try {
      track = await resolveTrack(query, interaction.user.username);
    } catch (err) {
      return interaction.editReply(`❌ ${err.message}`);
    }

    let state = getGuildPlayer(interaction.guildId);
    if (!state) {
      state = createGuildPlayer(interaction.guild, voiceChannel, interaction.channel);
    }

    const result = await enqueue(state, track);

    const embed = new EmbedBuilder()
      .setColor(0x1db954)
      .setThumbnail(track.thumbnail)
      .setTitle(result === "playing" ? "▶️ Reproduciendo ahora" : "➕ Agregada a la cola")
      .setDescription(`**${track.title}**`)
      .setFooter({ text: `Pedida por ${track.requestedBy}${result === "queued" ? ` · Posición en cola: ${state.queue.length}` : ""}` });

    await interaction.editReply({ embeds: [embed] });
    await repostMusicPanel(interaction.guild);
  }
};
