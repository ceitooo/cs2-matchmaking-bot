const { MUSIC_CHANNEL_ID, repostMusicPanel } = require("../music/panel");

module.exports = {
  name: "messageCreate",
  async execute(message) {
    if (message.author.bot) return;
    if (message.channelId !== MUSIC_CHANNEL_ID) return;
    if (!message.guild) return;

    await repostMusicPanel(message.guild);
  }
};
