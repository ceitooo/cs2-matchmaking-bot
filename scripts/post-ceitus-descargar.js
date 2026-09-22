require("dotenv").config();
const { Client, GatewayIntentBits, AttachmentBuilder } = require("discord.js");

const EXE_PATH = "C:\\Users\\holad\\chetox\\RbxESP\\x64\\Release\\Ceitus_v1.0.5.zip";
const VERSION  = "1.0.5";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.channels.fetch();

    const channel = guild.channels.cache.find(c => c.name === "ceitus-roblox-descargar");
    if (!channel) { console.error("Canal no encontrado."); return; }

    // Borrar solo el mensaje del bot que tenga un exe adjunto
    const msgs = await channel.messages.fetch({ limit: 50 });
    const prevExe = msgs.find(m =>
      m.author.id === client.user.id &&
      m.attachments.some(a => a.name && (a.name.endsWith(".exe") || a.name.endsWith(".zip")))
    );
    if (prevExe) await prevExe.delete().catch(() => {});

    const attachment = new AttachmentBuilder(EXE_PATH, { name: `Ceitus_v${VERSION}.zip` });
    await channel.send({ files: [attachment] });
    console.log("Publicado en:", channel.name);
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
