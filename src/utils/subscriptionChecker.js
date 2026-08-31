const { getSubscriptionsToNotify, markSubscriptionNotified, getGuildSettings } = require("../db/database");

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // cada 1 hora

async function notifyChannel(guild, sub, text) {
  const settings = getGuildSettings(guild.id);
  if (!settings.recordatorios_channel_id) return;

  const channel = await guild.channels.fetch(settings.recordatorios_channel_id).catch(() => null);
  if (!channel?.isTextBased()) return;

  await channel.send(`<@${sub.user_id}> — ${text}`).catch(() => {});
}

async function checkSubscriptions(client) {
  const due = getSubscriptionsToNotify();

  for (const sub of due) {
    const guild = await client.guilds.fetch(sub.guild_id).catch(() => null);
    if (!guild) continue;

    const member = await guild.members.fetch(sub.user_id).catch(() => null);
    if (!member) continue;

    const isExpired = sub.expires_at <= Date.now();
    const field = isExpired ? "notified_0d" : "notified_3d";
    if (sub[field] === 1) continue;

    const text = isExpired
      ? `⏰ Tu **${sub.product}** venció hoy. Contactá a un staff si querés renovarlo.`
      : `⏰ Tu **${sub.product}** vence <t:${Math.floor(sub.expires_at / 1000)}:R>. Contactá a un staff si querés renovarlo antes de que se corte.`;

    await member.send(text).catch(() => {});
    await notifyChannel(guild, sub, text);
    markSubscriptionNotified(sub.id, field);
  }
}

function startSubscriptionChecker(client) {
  checkSubscriptions(client).catch((e) => console.error("[subs] Error revisando suscripciones:", e.message));
  setInterval(() => {
    checkSubscriptions(client).catch((e) => console.error("[subs] Error revisando suscripciones:", e.message));
  }, CHECK_INTERVAL_MS);
}

module.exports = { startSubscriptionChecker };
