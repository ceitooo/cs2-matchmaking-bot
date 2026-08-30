const { getGuildSettings } = require("../db/database");
const { isStaffOrCeito } = require("../utils/permissions");

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

module.exports = {
  name: "messageCreate",
  async execute(message) {
    if (!message.guild || message.author.bot) return;

    const settings = getGuildSettings(message.guild.id);
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
