const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getGuildPlayer } = require("./player");

const MUSIC_CHANNEL_ID = "1339269473152270398"; // 🎶・musica

const panelMessages = new Map(); // guildId -> messageId

function formatDuration(sec) {
  if (!sec) return "--:--";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function buildMusicPanelPayload(guildId) {
  const state = getGuildPlayer(guildId);

  const embed = new EmbedBuilder().setColor(0x1db954).setTitle("🎵 Reproductor de música");

  if (!state || !state.current) {
    embed.setDescription("Nada sonando ahora mismo. Usa `/play <canción>` en este canal para empezar.");
  } else {
    embed
      .setDescription(`**Sonando ahora:**\n${state.current.title}`)
      .setThumbnail(state.current.thumbnail)
      .addFields(
        { name: "Duración", value: formatDuration(state.current.durationSec), inline: true },
        { name: "Volumen", value: `${state.volume}%`, inline: true },
        { name: "Loop", value: state.loop === "off" ? "Desactivado" : state.loop === "track" ? "Canción" : "Cola", inline: true },
        {
          name: `En cola (${state.queue.length})`,
          value: state.queue.length ? state.queue.slice(0, 5).map((t, i) => `${i + 1}. ${t.title}`).join("\n") : "_Vacía_"
        }
      );
  }

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("music_pauseresume").setLabel("⏯️ Pausar/Reanudar").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("music_skip").setLabel("⏭️ Saltar").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("music_stop").setLabel("⏹️ Detener").setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("music_voldown").setLabel("🔉 -10").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("music_volup").setLabel("🔊 +10").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("music_loop").setLabel("🔁 Loop").setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row1, row2] };
}

async function repostMusicPanel(guild) {
  const channel = await guild.channels.fetch(MUSIC_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const oldMessageId = panelMessages.get(guild.id);
  if (oldMessageId) {
    const oldMessage = await channel.messages.fetch(oldMessageId).catch(() => null);
    if (oldMessage) await oldMessage.delete().catch(() => {});
  }

  const message = await channel.send(buildMusicPanelPayload(guild.id)).catch(() => null);
  if (message) panelMessages.set(guild.id, message.id);
}

async function refreshMusicPanel(guild) {
  const channel = await guild.channels.fetch(MUSIC_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const messageId = panelMessages.get(guild.id);
  if (!messageId) return repostMusicPanel(guild);

  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) return repostMusicPanel(guild);

  await message.edit(buildMusicPanelPayload(guild.id)).catch(() => {});
}

module.exports = { MUSIC_CHANNEL_ID, buildMusicPanelPayload, repostMusicPanel, refreshMusicPanel };
