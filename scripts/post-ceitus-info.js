require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { buildInfoEmbed, saveState, loadState } = require("../src/utils/infoPanel");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.channels.fetch();

    const channel = guild.channels.cache.find(c => c.name === "ceitus-roblox-descargar");
    if (!channel) { console.error("Canal no encontrado."); return; }

    // Borrar embed de info anterior del bot (sin adjuntos)
    const msgs = await channel.messages.fetch({ limit: 50 });
    const prevInfo = msgs.find(m =>
      m.author.id === client.user.id &&
      m.embeds.length > 0 &&
      m.attachments.size === 0
    );
    if (prevInfo) await prevInfo.delete().catch(() => {});

    const state = loadState();
    const status  = state.status  ?? "activo";
    const version = state.version ?? null;

    const msg = await channel.send({ embeds: [buildInfoEmbed(status, version)] });

    // Guardar messageId y channelId para que el bot pueda editarlo luego
    saveState({ messageId: msg.id, channelId: channel.id, status, version });

    console.log("Info publicada en:", channel.name, "— messageId:", msg.id);
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
