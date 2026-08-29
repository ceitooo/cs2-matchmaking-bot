const { getGuildSettings } = require("../db/database");
const { buildWelcomeMessage } = require("../utils/welcomeBuilder");

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    const settings = getGuildSettings(member.guild.id);
    if (!settings.welcome_channel_id) return;

    const channel = await member.guild.channels.fetch(settings.welcome_channel_id).catch(() => null);
    if (!channel) return;

    await channel.send(buildWelcomeMessage(member, member.guild, settings)).catch(() => {});
  }
};
