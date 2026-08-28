require("dotenv").config();
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require("discord.js");

const EXCLUDED_CHANNEL_NAMES = ["✅・verificar-steam", "📜・reglas-y-elo"];
const VERIFIED_ROLE_NAME = "✅ Steam Verificado";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const role = guild.roles.cache.find((r) => r.name === VERIFIED_ROLE_NAME);
    if (!role) {
      console.log(`No se encontró el rol "${VERIFIED_ROLE_NAME}". Verifica a alguien primero para que se cree.`);
      return;
    }

    const channels = await guild.channels.fetch();
    let updated = 0;

    for (const channel of channels.values()) {
      if (!channel) continue;
      if (channel.type === ChannelType.GuildCategory) continue;
      if (EXCLUDED_CHANNEL_NAMES.includes(channel.name)) continue;

      await channel.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: false }).catch(() => {});
      await channel.permissionOverwrites.edit(role.id, { ViewChannel: true }).catch(() => {});
      updated++;
      console.log(`Restringido: ${channel.name}`);
    }

    console.log(`Listo. ${updated} canales actualizados. "${EXCLUDED_CHANNEL_NAMES.join(", ")}" quedaron visibles para todos.`);
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
