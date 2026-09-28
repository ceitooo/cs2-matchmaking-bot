const { AuditLogEvent } = require("discord.js");
const { db, getGuildSettings } = require("../db/database");
const { VERIFIED_ROLE_NAME } = require("../steam/verifyActions");

const AUDIT_WINDOW_MS = 15_000;

// Si otro bot le da el rol de Steam verificado a alguien que no vinculó su
// Steam con este bot, se lo quita. Los staff (humanos) sí pueden darlo a mano.
module.exports = {
  name: "guildMemberUpdate",
  async execute(oldMember, newMember) {
    if (newMember.guild.id !== process.env.GUILD_ID) return;

    const role = newMember.guild.roles.cache.find((r) => r.name === VERIFIED_ROLE_NAME);
    if (!role || !newMember.roles.cache.has(role.id)) return;
    if (!oldMember.partial && oldMember.roles.cache.has(role.id)) return;

    const player = db.prepare("SELECT steam_id FROM players WHERE user_id = ?").get(newMember.id);
    if (player?.steam_id) return;

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const audit = await newMember.guild.fetchAuditLogs({ type: AuditLogEvent.MemberRoleUpdate, limit: 10 }).catch(() => null);
    const entry = audit?.entries.find(
      (e) =>
        e.target?.id === newMember.id &&
        Date.now() - e.createdTimestamp < AUDIT_WINDOW_MS &&
        e.changes.some((c) => c.key === "$add" && c.new?.some((r) => r.id === role.id))
    );
    if (!entry?.executor) return;
    if (entry.executor.id === newMember.client.user.id) return;
    if (!entry.executor.bot) return;

    await newMember.roles.remove(role, `Rol dado por el bot ${entry.executor.tag} sin verificar Steam`).catch((e) => {
      console.error("[verificacion] No pude quitar el rol:", e.message);
    });

    const settings = getGuildSettings(newMember.guild.id);
    const logChannel = settings.log_verifications_channel_id
      ? await newMember.guild.channels.fetch(settings.log_verifications_channel_id).catch(() => null)
      : null;
    if (logChannel?.isTextBased()) {
      await logChannel
        .send(`🚫 **Rol de Steam quitado**\nUsuario: ${newMember.user.tag} (${newMember.id})\nLo dio el bot **${entry.executor.tag}** sin que el usuario vinculara su Steam.`)
        .catch(() => {});
    }
  }
};
