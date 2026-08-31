const { getGuildSettings, addKey, keyExists } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");

const SPAM_WINDOW_MS = 5000;
const SPAM_MAX_MESSAGES = 5;
const MUTE_DURATION_MS = 60 * 1000;

// Ej: CEITUS-ROJB-Q3DZ-61PE-5RU3 (recurso + 4 bloques de 4 caracteres).
// Sin \b al inicio/final a propósito: así también corta keys pegadas sin
// espacio entre ellas (el guion después del recurso ya marca el límite).
const KEY_REGEX = /[A-Z][A-Z0-9]{1,11}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/gi;

const recentMessages = new Map(); // `${guildId}:${userId}` -> timestamps[]

function isSpamming(guildId, userId) {
  const key = `${guildId}:${userId}`;
  const now = Date.now();
  const timestamps = (recentMessages.get(key) ?? []).filter((t) => now - t < SPAM_WINDOW_MS);
  timestamps.push(now);
  recentMessages.set(key, timestamps);
  return timestamps.length >= SPAM_MAX_MESSAGES;
}

async function detectAndStoreKeys(message, settings) {
  if (!settings.stock_keys_channel_id || message.channelId !== settings.stock_keys_channel_id) return;

  const matches = message.content.match(KEY_REGEX);
  if (!matches || matches.length === 0) return;

  const added = [];
  for (const raw of matches) {
    const key = raw.trim().toUpperCase();
    if (keyExists(message.guild.id, key)) continue;

    const resourceRaw = key.split("-")[0];
    const resource = resourceRaw.charAt(0) + resourceRaw.slice(1).toLowerCase();
    addKey(message.guild.id, resource, key, message.author.id);
    added.push(resource);
  }

  if (added.length === 0) return;

  await message.react("✅").catch(() => {});

  const counts = added.reduce((acc, r) => {
    acc[r] = (acc[r] ?? 0) + 1;
    return acc;
  }, {});
  const summary = Object.entries(counts)
    .map(([r, n]) => `**${n}** llave${n === 1 ? "" : "s"} de **${r}**`)
    .join(", ");

  await message.channel.send(`✅ ${added.length} llave${added.length === 1 ? "" : "s"} guardada${added.length === 1 ? "" : "s"} con éxito (${summary}).`).catch(() => {});
}

module.exports = {
  name: "messageCreate",
  async execute(message) {
    if (!message.guild) return;

    const settings = getGuildSettings(message.guild.id);
    await detectAndStoreKeys(message, settings);

    if (message.author.bot) return;
    if (!settings.automod_enabled) return;
    if (isStaffOrCeito({ member: message.member, memberPermissions: message.member?.permissions })) return;

    if (!isSpamming(message.guild.id, message.author.id)) return;

    const member = message.member;
    if (!member?.moderatable) return;

    await member.timeout(MUTE_DURATION_MS, "Automod: spam de mensajes").catch(() => {});

    await message.channel
      .send(`🔇 ${message.author} fue silenciado 1 minuto por hacer spam.`)
      .then((m) => setTimeout(() => m.delete().catch(() => {}), 8000))
      .catch(() => {});

    if (settings.log_server_channel_id) {
      const logChannel = await message.guild.channels.fetch(settings.log_server_channel_id).catch(() => null);
      if (logChannel?.isTextBased()) {
        await logChannel
          .send(`🔇 **Automod:** ${message.author.tag} (${message.author.id}) silenciado 1 minuto por spam en <#${message.channelId}>.`)
          .catch(() => {});
      }
    }
  }
};
