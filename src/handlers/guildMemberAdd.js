const { getGuildSettings, addInviteUse, getInviteCount } = require("../db/database");
const { buildWelcomeMessage } = require("../utils/welcomeBuilder");
const { resolveInviter } = require("../utils/inviteTracker");

async function logServerEvent(member, settings, text) {
  if (!settings.log_server_channel_id) return;
  const channel = await member.guild.channels.fetch(settings.log_server_channel_id).catch(() => null);
  if (channel?.isTextBased()) await channel.send(text).catch(() => {});
}

async function trackInvite(member, settings) {
  if (!settings.invites_channel_id) return;

  const resolved = await resolveInviter(member.guild).catch(() => null);
  const channel = await member.guild.channels.fetch(settings.invites_channel_id).catch(() => null);
  if (!channel?.isTextBased()) return;

  if (!resolved?.inviterId) {
    await channel.send(`📨 ${member.user.tag} se unió (invitación no identificada, ej. link vanity).`).catch(() => {});
    return;
  }

  addInviteUse(member.guild.id, resolved.inviterId, 1);
  const total = getInviteCount(member.guild.id, resolved.inviterId);

  await channel
    .send(`📨 ${member.user.tag} se unió invitado por <@${resolved.inviterId}> — ahora tiene **${total}** invitación${total === 1 ? "" : "es"}.`)
    .catch(() => {});
}

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    const settings = getGuildSettings(member.guild.id);

    await logServerEvent(member, settings, `📥 **Miembro se unió:** ${member.user.tag} (${member.id})`);
    await trackInvite(member, settings);

    if (!settings.welcome_channel_id) return;

    const channel = await member.guild.channels.fetch(settings.welcome_channel_id).catch(() => null);
    if (!channel) return;

    await channel.send(buildWelcomeMessage(member, member.guild, settings)).catch(() => {});
  }
};
