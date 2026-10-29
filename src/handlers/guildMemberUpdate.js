const { AuditLogEvent, PermissionFlagsBits } = require("discord.js");
const { getGuildSettings } = require("../db/database");
const { STAFF_ROLE_ID, HIGHEST_ADMIN_ROLE_ID, CEITO_ROLE_ID, DEVELOPER_ROLE_ID } = require("../utils/permissions");

const revertingNicknames = new Set();

const STAFF_ROLE_NAMES = /^(staff|ceito|developer|founder|admin|administrador|moderador|pre-staff|dueño|owner)$/i;
const KNOWN_STAFF_ROLE_IDS = new Set([
  "1339092743569539144", // Staff (Ceitus)
  "1339092538413551686", // Ceito
  "1487999355876278452", // Developer
  "1562938605029171332", // Pre-staff
  STAFF_ROLE_ID,         // 783795046780633089
  HIGHEST_ADMIN_ROLE_ID  // 748613830074171434
]);

function isStaffMember(member) {
  if (!member) return false;
  if (member.id === member.guild.ownerId) return true;
  if (
    member.permissions?.has(PermissionFlagsBits.Administrator) ||
    member.permissions?.has(PermissionFlagsBits.ManageGuild) ||
    member.permissions?.has(PermissionFlagsBits.ManageNicknames)
  ) {
    return true;
  }
  const roles = member.roles?.cache;
  if (!roles) return false;
  for (const id of KNOWN_STAFF_ROLE_IDS) {
    if (roles.has(id)) return true;
  }
  return roles.some((r) => STAFF_ROLE_NAMES.test(r.name.trim()));
}

async function logNicknameChange(oldMember, newMember, settings, reasonNote = "") {
  if (!settings?.log_nicknames_channel_id) return;

  const channel = await newMember.guild.channels.fetch(settings.log_nicknames_channel_id).catch(() => null);
  if (!channel?.isTextBased()) return;

  const before = oldMember.nickname ?? oldMember.user.username;
  const after = newMember.nickname ?? newMember.user.username;
  const extra = reasonNote ? `\nNota: ${reasonNote}` : "";

  await channel
    .send(`✏️ **Apodo cambiado**\nUsuario: ${newMember.user.tag} (${newMember.id})\nAntes: ${before}\nAhora: ${after}${extra}`)
    .catch(() => {});
}

async function handleNicknameGuard(oldMember, newMember, settings) {
  // Solo actuar si hubo cambio en el apodo
  if (oldMember.nickname === newMember.nickname) return;
  if (newMember.user.bot) return;

  // Evitar bucle de eventos si el bot fue quien restableció el apodo
  if (revertingNicknames.has(newMember.id)) {
    revertingNicknames.delete(newMember.id);
    return;
  }

  // Si el usuario es Staff, tiene autorización completa para cambiar su propio apodo
  if (isStaffMember(newMember)) {
    await logNicknameChange(oldMember, newMember, settings, "Autorizado (Staff)");
    return;
  }

  // Verificar en Audit Logs si el cambio fue realizado por un miembro del Staff (moderación)
  let changedByStaff = false;
  try {
    // Pausa breve para que Discord registre el evento en el log de auditoría
    await new Promise((r) => setTimeout(r, 650));
    const logs = await newMember.guild.fetchAuditLogs({
      limit: 4,
      type: AuditLogEvent.MemberUpdate
    }).catch(() => null);

    if (logs && logs.entries.size > 0) {
      const entry = logs.entries.find(
        (e) =>
          e.target?.id === newMember.id &&
          e.changes?.some((c) => c.key === "nick") &&
          Date.now() - e.createdTimestamp < 8000
      );

      if (entry && entry.executor) {
        const executor = await newMember.guild.members.fetch(entry.executor.id).catch(() => null);
        if (executor && isStaffMember(executor) && executor.id !== newMember.id) {
          changedByStaff = true;
        }
      }
    }
  } catch (err) {
    console.warn("[nickname-guard] Error al consultar Audit Logs:", err.message);
  }

  // Si fue editado por un Staff sobre este usuario, se acepta
  if (changedByStaff) {
    await logNicknameChange(oldMember, newMember, settings, "Modificado por Staff");
    return;
  }

  // Usuario no autorizado intentó cambiar su propio apodo: revertir inmediatamente
  const restoredNick = oldMember.nickname ?? null;
  revertingNicknames.add(newMember.id);

  try {
    await newMember.setNickname(restoredNick, "Solo los miembros del rol Staff pueden cambiar de apodo en Ceitus");
    console.log(`[nickname-guard] Apodo no autorizado revertido para ${newMember.user.tag} (${newMember.id}) en ${newMember.guild.name}`);
  } catch (err) {
    revertingNicknames.delete(newMember.id);
    console.error(`[nickname-guard] Error al restaurar apodo para ${newMember.user.tag}:`, err.message);
  }

  // Notificar al usuario por mensaje privado (DM)
  newMember.send({
    content: `⚠️ Hola **${newMember.user.username}**, en el servidor **${newMember.guild.name}** los cambios de apodo están restringidos. Solo los miembros con rol **Staff** tienen autorización para modificar apodos. Tu apodo anterior ha sido restaurado.`
  }).catch(() => {});

  // Registrar en el canal de logs si está configurado
  if (settings?.log_nicknames_channel_id) {
    const channel = await newMember.guild.channels.fetch(settings.log_nicknames_channel_id).catch(() => null);
    if (channel?.isTextBased()) {
      const before = oldMember.nickname ?? oldMember.user.username;
      const attempted = newMember.nickname ?? newMember.user.username;
      await channel
        .send(
          `🛡️ **Cambio de apodo bloqueado y revertido**\n` +
          `**Usuario:** ${newMember.user.tag} (<@${newMember.id}>)\n` +
          `**Intentó cambiar a:** \`${attempted}\`\n` +
          `**Restaurado a:** \`${before}\`\n` +
          `**Motivo:** Solo el rol Staff puede cambiar apodos.`
        )
        .catch(() => {});
    }
  }
}

const CEITOTWEAKS_GUILD_ID = "1339090100424019978";
const VERIFIED_ROLE_ID = "1563952522463543380";
const USER_ROLE_ID = "1339103137901969439";

async function handleVerificationSync(oldMember, newMember) {
  if (newMember.guild.id !== CEITOTWEAKS_GUILD_ID || newMember.user.bot) return;

  const hadVerified = oldMember.roles.cache.has(VERIFIED_ROLE_ID);
  const hasVerified = newMember.roles.cache.has(VERIFIED_ROLE_ID);
  const hadUser = oldMember.roles.cache.has(USER_ROLE_ID);
  const hasUser = newMember.roles.cache.has(USER_ROLE_ID);

  // Si recibe Verified (por ejemplo vía RestoreCord), otorgar automáticamente rol User
  if (!hadVerified && hasVerified && !hasUser) {
    await newMember.roles.add(USER_ROLE_ID, "Auto-sync: otorgar rol User al verificarse").catch(() => {});
  }
  // Si recibe User, otorgar automáticamente rol Verified
  else if (!hadUser && hasUser && !hasVerified) {
    await newMember.roles.add(VERIFIED_ROLE_ID, "Auto-sync: otorgar rol Verified al recibir User").catch(() => {});
  }
}

module.exports = {
  name: "guildMemberUpdate",
  async execute(oldMember, newMember) {
    const settings = getGuildSettings(newMember.guild.id);
    await handleNicknameGuard(oldMember, newMember, settings);
    await handleVerificationSync(oldMember, newMember);
  }
};
