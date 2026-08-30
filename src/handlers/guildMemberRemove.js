const { getGuildSettings } = require("../db/database");
const { primeGuildInvites } = require("../utils/inviteTracker");

module.exports = {
  name: "guildMemberRemove",
  async execute(member) {
    const settings = getGuildSettings(member.guild.id);

    // Resincroniza el cache de invites para no perder de referencia si alguien borra un invite al salir
    await primeGuildInvites(member.guild).catch(() => {});

    if (!settings.log_server_channel_id) return;
    const channel = await member.guild.channels.fetch(settings.log_server_channel_id).catch(() => null);
    if (!channel?.isTextBased()) return;

    await channel.send(`📤 **Miembro salió:** ${member.user.tag} (${member.id})`).catch(() => {});
  }
};
