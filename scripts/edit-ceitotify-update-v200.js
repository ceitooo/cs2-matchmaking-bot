require("dotenv").config();
const path = require("path");
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");

// Edita el anuncio de Ceitotify v2.0 ya publicado (titulo sin "Aurora" e
// imagen del logo nueva), sin publicar un mensaje nuevo.
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
const LOGO = path.join(__dirname, "..", "assets", "ceitotify-v200-logo.png");

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.find((c) => c.name && c.name.toLowerCase().includes("ceitotify-updates"));
    if (!channel) return console.error("Canal ceitotify-updates no encontrado.");

    const msgs = await channel.messages.fetch({ limit: 20 });
    const msg = msgs.find((m) => m.author.id === client.user.id && m.embeds[0]?.title?.includes("Ceitotify v2.0"));
    if (!msg) return console.error("No se encontro el anuncio de v2.0.");

    const embed = EmbedBuilder.from(msg.embeds[0])
      .setTitle("🎧 Ceitotify v2.0 — Update")
      .setImage("attachment://ceitotify-v200-logo.png");
    embed.setFields(
      (msg.embeds[0].fields || []).map((f) => ({ ...f, value: f.value.replace(/Aurora, /g, "Ceitotify, ") }))
    );
    const file = new AttachmentBuilder(LOGO, { name: "ceitotify-v200-logo.png" });
    await msg.edit({ embeds: [embed], files: [file], attachments: [] });
    const edited = await channel.messages.fetch(msg.id);
    console.log("Editado:", edited.embeds[0].title, "| aurora en texto:", /aurora/i.test(JSON.stringify(edited.embeds[0].toJSON())));
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
