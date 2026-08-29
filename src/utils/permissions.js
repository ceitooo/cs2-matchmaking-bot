const { PermissionFlagsBits } = require("discord.js");

// Rol "ceito" — mismo rol usado como bypass de Steam en interactionCreate.js
const CEITO_ROLE_ID = "1339092538413551686";

function isStaffOrCeito(interaction) {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return true;
  return interaction.member?.roles?.cache?.has(CEITO_ROLE_ID) ?? false;
}

module.exports = { isStaffOrCeito, CEITO_ROLE_ID };
