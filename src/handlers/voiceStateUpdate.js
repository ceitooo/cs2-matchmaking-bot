const { handleVoiceChannelEmpty } = require("../utils/quickQueue");

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState) {
    const leftChannel = oldState.channel;
    if (!leftChannel) return;
    if (newState.channelId === leftChannel.id) return;

    await handleVoiceChannelEmpty(leftChannel).catch(() => {});
  }
};
