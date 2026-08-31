const { getGuildSettings } = require("../db/database");
const { checkAntiNuke } = require("../utils/antiNuke");

module.exports = {
  name: "guildBanAdd",
  async execute(ban) {
    const settings = getGuildSettings(ban.guild.id);

    const auditEntry = await ban.guild
      .fetchAuditLogs({ type: 22 /* MemberBanAdd */, limit: 5 })
      .then((logs) => logs.entries.find((e) => e.target?.id === ban.user.id && Date.now() - e.createdTimestamp < 15_000))
      .catch(() => null);

    if (auditEntry?.executor) await checkAntiNuke(ban.guild, auditEntry.executor.id, "baneos").catch(() => {});

    if (!settings.log_bans_channel_id) return;
    const channel = await ban.guild.channels.fetch(settings.log_bans_channel_id).catch(() => null);
    if (!channel?.isTextBased()) return;

    const executor = auditEntry?.executor ? `${auditEntry.executor.tag} (${auditEntry.executor.id})` : "Desconocido";
    const reason = auditEntry?.reason || ban.reason || "Sin motivo especificado";

    await channel
      .send(`🔨 **Usuario baneado**\nUsuario: ${ban.user.tag} (${ban.user.id})\nBaneado por: ${executor}\nMotivo: ${reason}`)
      .catch(() => {});
  }
};
