const { getGuildSettings } = require("../db/database");
const { primeGuildInvites } = require("../utils/inviteTracker");
const { checkAntiNuke } = require("../utils/antiNuke");

module.exports = {
  name: "guildMemberRemove",
  async execute(member) {
    const settings = getGuildSettings(member.guild.id);

    // Resincroniza el cache de invites para no perder de referencia si alguien borra un invite al salir
    await primeGuildInvites(member.guild).catch(() => {});

    const kickEntry = await member.guild
      .fetchAuditLogs({ type: 20 /* MemberKick */, limit: 5 })
      .then((logs) => logs.entries.find((e) => e.target?.id === member.id && Date.now() - e.createdTimestamp < 15_000))
      .catch(() => null);

    if (kickEntry?.executor) await checkAntiNuke(member.guild, kickEntry.executor.id, "kicks").catch(() => {});

    if (!settings.log_server_channel_id) return;
    const channel = await member.guild.channels.fetch(settings.log_server_channel_id).catch(() => null);
    if (!channel?.isTextBased()) return;

    await channel.send(`📤 **Miembro salió:** ${member.user.tag} (${member.id})`).catch(() => {});
  }
};
