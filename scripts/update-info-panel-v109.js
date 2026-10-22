require("dotenv").config();
const { Client, GatewayIntentBits, AttachmentBuilder } = require("discord.js");
const { buildInfoEmbed, loadState } = require("../src/utils/infoPanel");

const ZIP_PATH = "C:\\Users\\holad\\chetox\\Ceitus_v1.0.9.zip";
const VERSION  = "1.0.9";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once("clientReady", async () => {
  try {
    const state = loadState();
    if (!state.channelId || !state.messageId) {
      console.error("No hay channelId/messageId en el state file.");
      process.exit(1);
    }

    const channel = await client.channels.fetch(state.channelId);

    // 1) Editar el embed principal con las features de v1.0.9
    const infoMsg = await channel.messages.fetch(state.messageId);
    await infoMsg.edit({ embeds: [buildInfoEmbed(state.status ?? "activo", null)] });
    console.log("✅ Embed de info actualizado a v1.0.9");

    // 2) Actualizar el ZIP: borrar el viejo del bot y postear el nuevo
    const msgs = await channel.messages.fetch({ limit: 50 });
    const prevZip = msgs.find(m =>
      m.author.id === client.user.id &&
      m.attachments.some(a => a.name && a.name.endsWith(".zip"))
    );
    if (prevZip) {
      await prevZip.delete().catch(() => {});
      console.log("🗑️  ZIP viejo eliminado");
    }

    const attachment = new AttachmentBuilder(ZIP_PATH, { name: `Ceitus_v${VERSION}.zip` });
    await channel.send({ files: [attachment] });
    console.log(`✅ ZIP Ceitus_v${VERSION}.zip posteado`);

  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
