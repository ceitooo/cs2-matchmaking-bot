const { EmbedBuilder } = require("discord.js");
const { db } = require("../db/database");
const { fetchDanbooruImage } = require("../utils/danbooru");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // revisa cada 30 min si ya toca postear

// Danbooru limita búsquedas anónimas a 2 tags, uno ya es "rating:general" — queda 1 libre por objetivo
const TARGETS = [
  { channelField: "wallpaper_pc_channel_id", tag: "scenery", orientation: "landscape", title: "🖥️ Wallpaper PC" },
  { channelField: "wallpaper_mobile_channel_id", tag: "scenery", orientation: "portrait", title: "📱 Wallpaper Móvil" },
  { channelField: "banner_channel_id", tag: "scenery", orientation: "landscape", title: "🎌 Banner Anime" },
  { channelField: "icon_channel_id", tag: "solo", orientation: "square", title: "🎌 Icono Anime" }
];

async function postForGuild(client, settings) {
  for (const target of TARGETS) {
    const channelId = settings[target.channelField];
    if (!channelId) continue;

    try {
      const result = await fetchDanbooruImage(target.tag, target.orientation);
      if (!result) continue;

      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel?.isTextBased()) continue;

      const embed = new EmbedBuilder()
        .setTitle(target.title)
        .setImage(result.imageUrl)
        .setURL(result.pageUrl)
        .setFooter({ text: result.resolution ? `Resolución: ${result.resolution} • Danbooru` : "Danbooru" })
        .setColor(0x9b59b6);

      await channel.send({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      console.error(`[wallpapers] Error posteando en ${target.channelField}:`, error.message);
    }
  }
}

async function tick(client) {
  const rows = db
    .prepare(
      `SELECT * FROM guild_settings WHERE
        wallpaper_pc_channel_id IS NOT NULL OR
        wallpaper_mobile_channel_id IS NOT NULL OR
        banner_channel_id IS NOT NULL OR
        icon_channel_id IS NOT NULL`
    )
    .all();

  const now = Date.now();

  for (const settings of rows) {
    const last = settings.wallpaper_last_posted_at ?? 0;
    if (now - last < ONE_DAY_MS) continue;

    await postForGuild(client, settings);
    db.prepare("UPDATE guild_settings SET wallpaper_last_posted_at = ? WHERE guild_id = ?").run(now, settings.guild_id);
  }
}

function startWallpaperScheduler(client) {
  // Primer chequeo poco después de encender el bot, luego cada 30 min
  setTimeout(() => tick(client).catch((e) => console.error("[wallpapers] Error en tick inicial:", e)), 15_000);
  setInterval(() => tick(client).catch((e) => console.error("[wallpapers] Error en tick:", e)), CHECK_INTERVAL_MS);
}

module.exports = { startWallpaperScheduler, postForGuild };
