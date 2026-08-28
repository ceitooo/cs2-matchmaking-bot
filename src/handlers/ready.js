const { repostMusicPanel } = require("../music/panel");

module.exports = {
  name: "clientReady",
  once: true,
  async execute(client) {
    console.log(`Bot conectado como ${client.user.tag}`);

    if (process.env.GUILD_ID) {
      const guild = await client.guilds.fetch(process.env.GUILD_ID).catch(() => null);
      if (guild) await repostMusicPanel(guild).catch((err) => console.error("Error publicando panel de música:", err.message));
    }
  }
};
