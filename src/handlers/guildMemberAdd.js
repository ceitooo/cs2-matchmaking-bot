const { StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder } = require("discord.js");
const { getGuildSettings, addInviteUse, getInviteCount, claimPendingRewards, getAvailableResources } = require("../db/database");
const { buildWelcomeMessage } = require("../utils/welcomeBuilder");
const { resolveInviter } = require("../utils/inviteTracker");

async function sendInviteReward(guild, inviterId) {
  const inviter = await guild.members.fetch(inviterId).catch(() => null);
  if (!inviter) return;

  const resources = getAvailableResources(guild.id);

  const embed = new EmbedBuilder()
    .setTitle("🎉 ¡Felicidades, conseguiste 5 invitaciones!")
    .setColor(0x2ecc71)
    .setDescription(
      resources.length > 0
        ? "Elegí 1 día de uno de los siguientes recursos y te mando la key acá mismo:"
        : "Todavía no hay recursos cargados para canjear. Avisale a un admin, tu premio queda pendiente."
    );

  if (resources.length === 0) {
    await inviter.send({ embeds: [embed] }).catch(() => {});
    return;
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`invite_reward:${guild.id}`)
    .setPlaceholder("Elegí un recurso")
    .addOptions(resources.map((r) => ({ label: `${r.resource} (1 día)`, value: r.resource, description: `Stock: ${r.stock}` })));

  await inviter.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] }).catch(() => {});
}

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

  const rewardsEarned = claimPendingRewards(member.guild.id, resolved.inviterId);
  for (let i = 0; i < rewardsEarned; i++) {
    await sendInviteReward(member.guild, resolved.inviterId);
  }
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
