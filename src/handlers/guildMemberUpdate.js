const { getGuildSettings } = require("../db/database");
const { buildBoostMessage } = require("../utils/boostBuilder");

module.exports = {
  name: "guildMemberUpdate",
  async execute(oldMember, newMember) {
    const startedBoosting = !oldMember.premiumSince && newMember.premiumSince;
    if (!startedBoosting) return;

    const settings = getGuildSettings(newMember.guild.id);
    if (!settings.boost_channel_id) return;

    const channel = await newMember.guild.channels.fetch(settings.boost_channel_id).catch(() => null);
    if (!channel) return;

    await channel.send(buildBoostMessage(newMember, newMember.guild, settings)).catch(() => {});
  }
};
