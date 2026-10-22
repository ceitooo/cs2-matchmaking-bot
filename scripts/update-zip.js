require("dotenv").config();
const { Client, GatewayIntentBits, AttachmentBuilder } = require("discord.js");

const CHANNEL_ID = "1558255083333099550";
const ZIP_PATH = "C:\\Users\\holad\\chetox\\Ceitus_v1.0.9.zip";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once("ready", async () => {
  console.log(`Bot: ${client.user.tag}`);
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    const msgs = await channel.messages.fetch({ limit: 50 });

    for (const m of msgs.filter(m => m.author.id === client.user.id && m.attachments.size > 0).values()) {
      await m.delete().catch(() => {});
      console.log(`Borrado mensaje con ZIP: ${m.id}`);
    }

    const attachment = new AttachmentBuilder(ZIP_PATH, { name: "Ceitus_v1.0.9.zip" });
    const sent = await channel.send({ files: [attachment] });
    console.log(`ZIP subido: ${sent.id}`);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
