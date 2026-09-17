const { EmbedBuilder } = require("discord.js");
const {
  getGuildSettings,
  updateGuildSettings,
  addKey,
  keyExists,
  getAfk,
  clearAfk,
  listFaqs,
  incrementAutomodOffense,
  addWarn,
  listBlacklistWords,
  canGainXp,
  addXp,
  getLevelRoles,
  getStickyMessage,
  setStickyMessageId,
  listScamDomains
} = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");
const { buildBoostMessage } = require("../utils/boostBuilder");
const { extractKeys, resolveResourceName } = require("../utils/keyDetection");
const { extractUrls, matchesScamDomain, hasImage, isSuspiciousNewAccount, getTimeoutMs } = require("../utils/scamFilter");

const STICKY_TITLE = "📨 Recompensas por invitar";

// Tipos de mensaje de sistema que Discord manda al boostear
const BOOST_MESSAGE_TYPES = [8, 9, 10, 11];

const SPAM_WINDOW_MS = 5000;
const SPAM_MAX_MESSAGES = 5;
const MUTE_DURATION_MS = 60 * 1000;

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

  const matches = extractKeys(message.content);
  if (matches.length === 0) return;

  const added = [];
  for (const key of matches) {
    if (keyExists(message.guild.id, key)) continue;

    const resourceRaw = key.split("-")[0];
    const resource = resolveResourceName(resourceRaw);
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

async function ensureInviteStickyBottom(message, settings) {
  if (!settings.invites_channel_id || message.channelId !== settings.invites_channel_id) return;
  if (message.author.id === message.client.user.id && message.embeds[0]?.title === STICKY_TITLE) return;

  const channel = message.channel;

  if (settings.invites_sticky_message_id) {
    const old = await channel.messages.fetch(settings.invites_sticky_message_id).catch(() => null);
    if (old) await old.delete().catch(() => {});
  }

  const embed = new EmbedBuilder()
    .setTitle(STICKY_TITLE)
    .setColor(0x5865f2)
    .setDescription("Por cada **5 invitaciones** válidas conseguís **7 días** del producto que esté disponible en stock. ¡Seguí invitando gente al server! 🚀");

  const sticky = await channel.send({ embeds: [embed] }).catch(() => null);
  if (sticky) updateGuildSettings(message.guild.id, { invites_sticky_message_id: sticky.id });
}

async function ensureGenericSticky(message) {
  const sticky = getStickyMessage(message.channelId);
  if (!sticky) return;
  if (message.author.id === message.client.user.id && message.id === sticky.message_id) return;

  if (sticky.message_id) {
    const old = await message.channel.messages.fetch(sticky.message_id).catch(() => null);
    if (old) await old.delete().catch(() => {});
  }

  const embed = new EmbedBuilder().setColor(0x5865f2).setDescription(sticky.content);
  const sent = await message.channel.send({ embeds: [embed] }).catch(() => null);
  if (sent) setStickyMessageId(message.channelId, sent.id);
}

async function scrubVerificationChannel(message) {
  if (message.channel.name !== "✅・verificacion") return;
  if (message.author.bot) return;
  await message.delete().catch(() => {});
}

function isGreeting(content) {
  const normalized = content.trim().toLowerCase().replace(/[!¡.,¿?]+$/g, "");
  return /^h?o+l+a+s?$/.test(normalized);
}

function isTicketChannel(channel) {
  return channel.name.startsWith("ticket-") || channel.parent?.name === "🎫・Tickets";
}

async function handleGreeting(message) {
  if (message.author.bot) return;
  if (isTicketChannel(message.channel)) return;
  if (!isGreeting(message.content)) return;
  await message.reply("👋 ¡Hola! ¿Cómo estás?").catch(() => {});
}

async function handleFaq(message) {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();
  const faqs = listFaqs(message.guild.id);
  const match = faqs.find((f) => content.includes(f.keyword));
  if (!match) return;

  await message.reply(match.respuesta).catch(() => {});
}

async function handleBlacklist(message) {
  if (message.author.bot) return;
  if (isStaffOrCeito({ member: message.member, memberPermissions: message.member?.permissions })) return;

  const content = message.content.toLowerCase();
  const words = listBlacklistWords(message.guild.id);
  const match = words.find((w) => content.includes(w.word));
  if (!match) return;

  await message.delete().catch(() => {});
  await message.channel
    .send(`🚫 ${message.author}, ese mensaje contenía una palabra prohibida y fue eliminado.`)
    .then((m) => setTimeout(() => m.delete().catch(() => {}), 6000))
    .catch(() => {});
}

async function logSecurityAction(message, settings, text) {
  const logChannelId = settings.antiscam_log_channel_id || settings.antiraid_log_channel_id || settings.log_server_channel_id;
  if (!logChannelId) return;
  const channel = await message.guild.channels.fetch(logChannelId).catch(() => null);
  if (channel?.isTextBased()) await channel.send(text).catch(() => {});
}

async function handleScamProtection(message, settings) {
  if (message.author.bot) return;
  if (isStaffOrCeito({ member: message.member, memberPermissions: message.member?.permissions })) return;

  const urls = extractUrls(message);
  const imagePresent = hasImage(message);
  if (urls.length === 0 && !imagePresent) return;

  const scamDomains = listScamDomains(message.guild.id);
  const matchedDomain = matchesScamDomain(urls, scamDomains);

  const level = settings.security_level || "medio";
  const isHeuristicHit = !matchedDomain && level !== "basico" && urls.length > 0 && imagePresent && message.member && isSuspiciousNewAccount(message.member, level);

  if (!matchedDomain && !isHeuristicHit) return;

  await message.delete().catch(() => {});
  await addWarn(message.guild.id, message.author.id, message.client.user.id, matchedDomain ? `Anti-estafa: link a dominio bloqueado (${matchedDomain})` : "Anti-estafa: cuenta nueva con link + imagen sospechosos");

  if (message.member?.moderatable) {
    await message.member.timeout(getTimeoutMs(level), "Anti-estafa: mensaje sospechoso eliminado").catch(() => {});
  }

  await logSecurityAction(
    message,
    settings,
    matchedDomain
      ? `🚨 **Anti-estafa:** mensaje de ${message.author.tag} (${message.author.id}) eliminado en <#${message.channelId}> — dominio bloqueado: **${matchedDomain}**.`
      : `⚠️ **Anti-estafa (nivel ${level}):** mensaje de ${message.author.tag} (${message.author.id}) eliminado en <#${message.channelId}> — cuenta nueva con link + imagen, revisar manualmente.`
  );
}

// Discord manda su propio mensajito de "X acaba de mejorar el servidor". Lo
// reemplazamos por nuestro embed con imagen en el canal de boosts configurado.
async function replaceBoostSystemMessage(message, settings) {
  await message.delete().catch(() => {});

  const member = message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
  if (!member) return;

  const targetId = settings.boost_channel_id ?? message.channelId;
  const channel = await message.guild.channels.fetch(targetId).catch(() => null);
  if (!channel?.isTextBased()) return;

  await channel.send(buildBoostMessage(member, message.guild, settings)).catch((e) => console.error("[boost] Error mandando el embed:", e.message));
}

async function handleXp(message) {
  if (message.author.bot) return;
  if (isTicketChannel(message.channel)) return;
  if (!canGainXp(message.guild.id, message.author.id)) return;

  const amount = 15 + Math.floor(Math.random() * 11); // 15-25
  const result = addXp(message.guild.id, message.author.id, amount);
  if (!result.leveledUp) return;

  await message.channel.send(`🎉 ${message.author} subió a **nivel ${result.level}**!`).catch(() => {});

  const levelRoles = getLevelRoles(message.guild.id);
  const roleForLevel = levelRoles.find((r) => r.level === result.level);
  if (!roleForLevel) {
    console.log(`[niveles] ${message.author.tag} llegó a nivel ${result.level}, pero no hay rol configurado para ese nivel (usá /nivelrol asignar).`);
    return;
  }

  const role = message.guild.roles.cache.get(roleForLevel.role_id);
  if (!role) {
    console.warn(`[niveles] El rol ${roleForLevel.role_id} configurado para nivel ${result.level} ya no existe en el server.`);
    return;
  }

  const member = message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
  if (!member) {
    console.warn(`[niveles] No pude fetchear al miembro ${message.author.id} para darle el rol de nivel ${result.level}.`);
    return;
  }
  if (member.manageable === false) {
    console.warn(`[niveles] No puedo darle roles a ${message.author.tag}: mi rol está por debajo del suyo en la jerarquía.`);
    return;
  }

  await member.roles.add(role).catch((e) => console.error(`[niveles] Error dando el rol de nivel ${result.level}:`, e.message));
  console.log(`[niveles] ${message.author.tag} recibió el rol ${role.name} por llegar a nivel ${result.level}.`);
}

async function handleAfk(message) {
  if (message.author.bot) return;
  const guildId = message.guild.id;

  const selfAfk = getAfk(guildId, message.author.id);
  if (selfAfk) {
    clearAfk(guildId, message.author.id);
    await message.reply(`👋 Bienvenido de vuelta, ${message.author}. Te quité el AFK.`).catch(() => {});
  }

  if (message.mentions.users.size === 0) return;
  for (const [, user] of message.mentions.users) {
    if (user.id === message.author.id) continue;
    const afk = getAfk(guildId, user.id);
    if (afk) {
      await message.reply(`💤 **${user.username}** está AFK — motivo: ${afk.reason}`).catch(() => {});
    }
  }
}

module.exports = {
  name: "messageCreate",
  async execute(message) {
    if (!message.guild) return;

    const settings = getGuildSettings(message.guild.id);

    if (BOOST_MESSAGE_TYPES.includes(message.type)) {
      return replaceBoostSystemMessage(message, settings);
    }

    await detectAndStoreKeys(message, settings);
    await ensureInviteStickyBottom(message, settings);
    await ensureGenericSticky(message);
    await scrubVerificationChannel(message);
    await handleGreeting(message);
    await handleFaq(message);
    await handleBlacklist(message);
    await handleScamProtection(message, settings);
    await handleXp(message);
    await handleAfk(message);

    if (message.author.bot) return;
    if (!settings.automod_enabled) return;
    if (isStaffOrCeito({ member: message.member, memberPermissions: message.member?.permissions })) return;

    if (!isSpamming(message.guild.id, message.author.id)) return;

    const offenseCount = incrementAutomodOffense(message.guild.id, message.author.id);
    const member = message.member;

    if (offenseCount === 1) {
      await message.channel
        .send(`⚠️ ${message.author}, dejá de mandar mensajes tan seguido o te voy a silenciar.`)
        .then((m) => setTimeout(() => m.delete().catch(() => {}), 8000))
        .catch(() => {});
      return;
    }

    if (offenseCount === 3) {
      addWarn(message.guild.id, message.author.id, message.client.user.id, "Spam de mensajes (automod, reincidente)");
      await message.channel
        .send(`📋 ${message.author} recibió un **warn** por seguir haciendo spam después de la advertencia y el silencio.`)
        .then((m) => setTimeout(() => m.delete().catch(() => {}), 8000))
        .catch(() => {});
      return;
    }

    // offenseCount === 2, o 4+ (sigue aislando cada vez que reincide)
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
          .send(`🔇 **Automod:** ${message.author.tag} (${message.author.id}) silenciado 1 minuto por spam en <#${message.channelId}> (infracción #${offenseCount}).`)
          .catch(() => {});
      }
    }
  }
};
