const { PermissionFlagsBits } = require("discord.js");

const CEITO_ROLE_ID = "1339092538413551686";
const DEVELOPER_ROLE_ID = "1487999355876278452";

// Configuración especial para servidor 648606899658293307
const SPECIAL_GUILD_ID = "648606899658293307";
const HIGHEST_ADMIN_ROLE_ID = "748613830074171434"; // Rol más alto (antiraid, purga, comandos peligrosos)
const STAFF_ROLE_ID = "783795046780633089";         // Rol Staff
const MEMBER_ROLE_ID = "897275724493365299";        // Rol Miembros

// Comandos de Counter-Strike / Matchmaking desactivados en 648606899658293307
const CS2_MATCHMAKING_COMMANDS = new Set([
  "compe",
  "duo",
  "premier",
  "rank",
  "stats",
  "steam-stats",
  "vincular-steam",
  "resultado"
]);

// Comprueba si el usuario puede escribir/enviar mensajes en el canal actual
function canWriteInChannel(interaction) {
  if (!interaction.channel || !interaction.member) return true;
  const perms = interaction.channel.permissionsFor(interaction.member);
  if (!perms) return true;
  return perms.has(PermissionFlagsBits.SendMessages);
}

// Rol más alto o Ceito/Developer (para comandos peligrosos como antiraid, purga, etc.)
function isHighestRoleOrCeito(interaction) {
  if (interaction.guildId === SPECIAL_GUILD_ID) {
    const roles = interaction.member?.roles?.cache;
    return roles?.has(HIGHEST_ADMIN_ROLE_ID) ?? false;
  }
  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return true;
  const roles = interaction.member?.roles?.cache;
  return roles ? (roles.has(CEITO_ROLE_ID) || roles.has(DEVELOPER_ROLE_ID)) : false;
}

// Staff (en servidor especial: rol más alto o rol staff; en otros servidores: permisos de staff/ceito)
function isStaffOrCeito(interaction) {
  if (interaction.guildId === SPECIAL_GUILD_ID) {
    const roles = interaction.member?.roles?.cache;
    return (roles?.has(HIGHEST_ADMIN_ROLE_ID) || roles?.has(STAFF_ROLE_ID)) ?? false;
  }
  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return true;
  return interaction.member?.roles?.cache?.has(CEITO_ROLE_ID) ?? false;
}

// Para antiraid y comandos de desarrollador/administrador principal
function isCeitoOrDeveloper(interaction) {
  return isHighestRoleOrCeito(interaction);
}

// Verifica si un comando de CS2/Matchmaking está bloqueado en el servidor actual
function isCs2CommandBlockedInGuild(guildId, commandName) {
  return guildId === SPECIAL_GUILD_ID && CS2_MATCHMAKING_COMMANDS.has(commandName);
}

// Comprobación de autorización general en servidor especial:
// Permite comandos generales (como /help) en cualquier canal donde el usuario pueda ESCRIBIR.
function isMemberAuthorizedInSpecialGuild(interaction) {
  if (!canWriteInChannel(interaction)) return false;
  return true;
}

module.exports = {
  isStaffOrCeito,
  isCeitoOrDeveloper,
  isHighestRoleOrCeito,
  isCs2CommandBlockedInGuild,
  isMemberAuthorizedInSpecialGuild,
  canWriteInChannel,
  CEITO_ROLE_ID,
  DEVELOPER_ROLE_ID,
  SPECIAL_GUILD_ID,
  HIGHEST_ADMIN_ROLE_ID,
  STAFF_ROLE_ID,
  MEMBER_ROLE_ID,
  CS2_MATCHMAKING_COMMANDS
};
