const { AuditLogEvent, PermissionFlagsBits } = require("discord.js");
const { getGuildSettings } = require("../db/database");

// Tiempo máximo entre el add y la entrada del audit log para considerarla relacionada
const AUDIT_LOG_WINDOW_MS = 15_000;

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    if (!member.user.bot) return;

    const settings = getGuildSettings(member.guild.id);
    if (!settings.antiraid_enabled) return;

    const me = member.guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ViewAuditLog) || !me?.permissions.has(PermissionFlagsBits.BanMembers)) {
      console.warn(`[antiraid] Faltan permisos (Ver registro de auditoría / Banear) en ${member.guild.name}`);
      return;
    }

    // Da tiempo a que Discord registre la entrada de audit log del BOT_ADD
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const audit = await member.guild.fetchAuditLogs({ type: AuditLogEvent.BotAdd, limit: 5 }).catch(() => null);
    const entry = audit?.entries.find(
      (e) => e.target?.id === member.id && Date.now() - e.createdTimestamp < AUDIT_LOG_WINDOW_MS
    );

    const executor = entry?.executor;
    if (!executor) return;

    // No banear al dueño del servidor
    if (executor.id === member.guild.ownerId) return;

    const executorMember = await member.guild.members.fetch(executor.id).catch(() => null);

    // Staff con permiso de Administrador queda exento (agregar bots es parte de su trabajo)
    if (executorMember?.permissions.has(PermissionFlagsBits.Administrator)) return;

    if (executorMember && !executorMember.bannable) {
      console.warn(`[antiraid] No se pudo banear a ${executor.tag}: jerarquía de roles insuficiente`);
      return;
    }

    await member.kick("Anti-raid: bot añadido sin autorización").catch(() => {});
    await member.guild.members
      .ban(executor.id, { reason: "Anti-raid: agregó un bot no autorizado al servidor" })
      .catch(() => {});

    const logChannelId = settings.antiraid_log_channel_id || settings.welcome_channel_id;
    if (!logChannelId) return;

    const channel = await member.guild.channels.fetch(logChannelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    await channel
      .send({
        content:
          `🛡️ **Anti-raid activado**\n` +
          `Bot añadido: **${member.user.tag}** (${member.id}) — expulsado\n` +
          `Responsable: **${executor.tag}** (${executor.id}) — baneado`
      })
      .catch(() => {});
  }
};
