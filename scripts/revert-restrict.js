require("dotenv").config();
const { Client, GatewayIntentBits, ChannelType } = require("discord.js");

// Deja intactos solo estos dos (queremos que sigan restringidos al matchmaking)
const KEEP_RESTRICTED = ["📋・panel-partidas", "🏆・clasificacion"];

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const channels = await guild.channels.fetch();
    let reverted = 0;

    for (const channel of channels.values()) {
      if (!channel) continue;
      if (channel.type === ChannelType.GuildCategory) continue;
      if (KEEP_RESTRICTED.includes(channel.name)) continue;

      const everyoneOverwrite = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
      if (everyoneOverwrite) {
        await channel.permissionOverwrites.delete(guild.roles.everyone.id).catch(() => {});
      }

      reverted++;
      console.log(`Revertido: ${channel.name}`);
    }

    console.log(`Listo. ${reverted} canales revertidos a su visibilidad normal.`);
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
