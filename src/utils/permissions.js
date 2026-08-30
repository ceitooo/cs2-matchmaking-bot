const { PermissionFlagsBits } = require("discord.js");

// Rol "ceito" — mismo rol usado como bypass de Steam en interactionCreate.js
const CEITO_ROLE_ID = "1339092538413551686";
const DEVELOPER_ROLE_ID = "1487999355876278452";

function isStaffOrCeito(interaction) {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return true;
  return interaction.member?.roles?.cache?.has(CEITO_ROLE_ID) ?? false;
}

// Solo el rol Ceito o el rol Developer — sin bypass por permisos genéricos de servidor
function isCeitoOrDeveloper(interaction) {
  const roles = interaction.member?.roles?.cache;
  if (!roles) return false;
  return roles.has(CEITO_ROLE_ID) || roles.has(DEVELOPER_ROLE_ID);
}

module.exports = { isStaffOrCeito, isCeitoOrDeveloper, CEITO_ROLE_ID, DEVELOPER_ROLE_ID };
