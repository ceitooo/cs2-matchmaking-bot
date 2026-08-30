const { getGuildSettings } = require("../db/database");
const { buildBoostMessage } = require("../utils/boostBuilder");

async function logNicknameChange(oldMember, newMember, settings) {
  if (oldMember.nickname === newMember.nickname) return;
  if (!settings.log_nicknames_channel_id) return;

  const channel = await newMember.guild.channels.fetch(settings.log_nicknames_channel_id).catch(() => null);
  if (!channel?.isTextBased()) return;

  const before = oldMember.nickname ?? oldMember.user.username;
  const after = newMember.nickname ?? newMember.user.username;

  await channel
    .send(`✏️ **Apodo cambiado**\nUsuario: ${newMember.user.tag} (${newMember.id})\nAntes: ${before}\nAhora: ${after}`)
    .catch(() => {});
}

module.exports = {
  name: "guildMemberUpdate",
  async execute(oldMember, newMember) {
    const settings = getGuildSettings(newMember.guild.id);

    await logNicknameChange(oldMember, newMember, settings);

    const startedBoosting = !oldMember.premiumSince && newMember.premiumSince;
    if (!startedBoosting) return;

    if (!settings.boost_channel_id) return;

    const channel = await newMember.guild.channels.fetch(settings.boost_channel_id).catch(() => null);
    if (!channel) return;

    await channel.send(buildBoostMessage(newMember, newMember.guild, settings)).catch(() => {});
  }
};
