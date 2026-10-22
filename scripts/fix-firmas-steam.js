// Permite mandar links de Steam (con vista previa) en #firmas-steam del server Ceitus
require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once("clientReady", async () => {
  try {
    const ch = await client.channels.fetch("1346099080589217802");
    for (const name of ["User", "✅ Steam Verificado"]) {
      const role = ch.guild.roles.cache.find((r) => r.name === name);
      if (!role) continue;
      await ch.permissionOverwrites.edit(role, { ViewChannel: true, SendMessages: true, EmbedLinks: true, ReadMessageHistory: true });
      console.log("ok", name);
    }
  } catch (e) {
    console.error(e);
  } finally {
    client.destroy();
  }
});
client.login(process.env.DISCORD_TOKEN);
