const { EmbedBuilder } = require("discord.js");
const { db } = require("../db/database");
const { fetchWallpaper } = require("../utils/wallhaven");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // revisa cada 30 min si ya toca postear

const TARGETS = [
  { channelField: "wallpaper_pc_channel_id", ratio: "16x9", categoryField: "wallpaper_category", minRes: "1920x1080", title: "🖥️ Wallpaper PC" },
  { channelField: "wallpaper_mobile_channel_id", ratio: "9x16", categoryField: "wallpaper_category", minRes: "1080x1920", title: "📱 Wallpaper Móvil" },
  { channelField: "banner_channel_id", ratio: "16x9", category: "anime", minRes: "1920x1080", title: "🎌 Banner Anime" },
  { channelField: "icon_channel_id", ratio: "1x1", category: "anime", title: "🎌 Icono Anime" }
];

async function postForGuild(client, settings) {
  for (const target of TARGETS) {
    const channelId = settings[target.channelField];
    if (!channelId) continue;

    const category = target.category ?? settings[target.categoryField];

    try {
      const result = await fetchWallpaper({ ratio: target.ratio, category, minRes: target.minRes });
      if (!result) continue;

      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel?.isTextBased()) continue;

      const embed = new EmbedBuilder()
        .setTitle(target.title)
        .setImage(result.imageUrl)
        .setURL(result.pageUrl)
        .setFooter({ text: result.resolution ? `Resolución: ${result.resolution} • Wallhaven` : "Wallhaven" })
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
