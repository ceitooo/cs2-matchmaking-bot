const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { db } = require("../db/database");
const { PLATFORMS } = require("./platforms");

db.exec(`
CREATE TABLE IF NOT EXISTS stream_subs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  username TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  role_id TEXT,
  message TEXT,
  last_live_id TEXT,
  last_video_id TEXT,
  created_by TEXT,
  UNIQUE (guild_id, platform, username)
);
`);

const INTERVAL_MS = 60_000;
const TIKTOK_EVERY = 3; // TikTok cada 3 vueltas (~3 min) para no ser bloqueados
let tick = 0;
let client = null;

function addSub(fields) {
  db.prepare(
    `INSERT INTO stream_subs (guild_id, platform, username, channel_id, role_id, message, last_live_id, last_video_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (guild_id, platform, username) DO UPDATE SET
       channel_id = excluded.channel_id, role_id = excluded.role_id, message = excluded.message`
  ).run(
    fields.guildId, fields.platform, fields.username, fields.channelId, fields.roleId ?? null,
    fields.message ?? null, fields.lastLiveId ?? null, fields.lastVideoId ?? null, fields.createdBy
  );
}

function removeSub(guildId, platform, username) {
  return db.prepare("DELETE FROM stream_subs WHERE guild_id = ? AND platform = ? AND username = ?").run(guildId, platform, username).changes;
}

function listSubs(guildId) {
  return db.prepare("SELECT * FROM stream_subs WHERE guild_id = ? ORDER BY platform, username").all(guildId);
}

function buildLiveMessage(sub, result, { test = false } = {}) {
  const p = PLATFORMS[sub.platform];
  const live = result.live;
  const name = result.displayName || sub.username;
  const embed = new EmbedBuilder()
    .setColor(p.color)
    .setAuthor({ name: `${name} está en directo en ${p.name}`, iconURL: result.avatar || undefined, url: live.url })
    .setTitle(live.title || "En directo")
    .setURL(live.url)
    .setTimestamp();
  if (live.category) embed.addFields({ name: "🎮 Categoría", value: live.category, inline: true });
  if (live.viewers != null) embed.addFields({ name: "👀 Espectadores", value: String(live.viewers), inline: true });
  if (live.thumbnail) embed.setImage(live.thumbnail);
  if (test) embed.setFooter({ text: "Mensaje de prueba" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Ver directo").setURL(live.url)
  );
  const mention = sub.role_id ? (sub.role_id === sub.guild_id ? "@everyone " : `<@&${sub.role_id}> `) : "";
  const text = (sub.message || "{user} está en directo en {platform}!").replace(/{user}/g, name).replace(/{platform}/g, p.name).replace(/{link}/g, live.url).replace(/{perfil}/g, p.profile(sub.username));
  return { content: `${mention}${p.emoji} ${text}`, embeds: [embed], components: [row], allowedMentions: { parse: ["roles", "everyone"] } };
}

function buildVideoMessage(sub, result) {
  const p = PLATFORMS[sub.platform];
  const v = result.video;
  const name = result.displayName || sub.username;
  const embed = new EmbedBuilder()
    .setColor(p.color)
    .setAuthor({ name: `${name} subió un nuevo video` })
    .setTitle(v.title || "Nuevo video")
    .setURL(v.url)
    .setImage(v.thumbnail)
    .setTimestamp();
  const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Ver video").setURL(v.url));
  const mention = sub.role_id ? (sub.role_id === sub.guild_id ? "@everyone " : `<@&${sub.role_id}> `) : "";
  return { content: `${mention}📺 ¡Nuevo video de **${name}**!`, embeds: [embed], components: [row], allowedMentions: { parse: ["roles", "everyone"] } };
}

async function send(sub, payload) {
  const channel = await client.channels.fetch(sub.channel_id).catch(() => null);
  if (!channel?.isTextBased()) return;
  await channel.send(payload).catch((e) => console.error(`[streams] No se pudo enviar en ${sub.channel_id}:`, e.message));
}

async function runCheck() {
  tick++;
  const subs = db.prepare("SELECT * FROM stream_subs").all();
  const cache = new Map(); // una consulta por cuenta aunque esté en varios servers

  for (const sub of subs) {
    if (sub.platform === "tiktok" && tick % TIKTOK_EVERY !== 1) continue;
    const key = `${sub.platform}:${sub.username}`;
    try {
      if (!cache.has(key)) cache.set(key, PLATFORMS[sub.platform].check(sub.username));
      const result = await cache.get(key);
      if (result.notFound) continue;

      if (result.live && result.live.id !== sub.last_live_id) {
        db.prepare("UPDATE stream_subs SET last_live_id = ? WHERE id = ?").run(result.live.id, sub.id);
        await send(sub, buildLiveMessage(sub, result));
      }
      // Videos (YouTube). Si el "video" es el mismo directo ya avisado, no se repite.
      if (result.video && result.video.id !== sub.last_video_id) {
        db.prepare("UPDATE stream_subs SET last_video_id = ? WHERE id = ?").run(result.video.id, sub.id);
        const isTheLive = result.video.id === (result.live?.id ?? sub.last_live_id);
        if (sub.last_video_id && !isTheLive) await send(sub, buildVideoMessage(sub, result));
      }
    } catch (e) {
      console.error(`[streams] Error revisando ${key}:`, e.message);
    }
  }
}

function startStreamChecker(discordClient) {
  client = discordClient;
  const loop = () => runCheck().catch((e) => console.error("[streams]", e)).finally(() => setTimeout(loop, INTERVAL_MS));
  setTimeout(loop, 15_000);
  console.log("[streams] Notificaciones de directos activas.");
}

module.exports = { startStreamChecker, addSub, removeSub, listSubs, buildLiveMessage, buildVideoMessage };
