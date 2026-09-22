require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const fs   = require("fs");
const path = require("path");

const VERSION_FILE = path.join(__dirname, ".roblox_version_cache.txt");
const NEW_VERSION  = "version-2366ba214ec740ca";
const OLD_VERSION  = "version-4310300497aa4917";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once("ready", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.channels.fetch();

    const channel =
      guild.channels.cache.find(c => c.name === "roblox-updates") ??
      guild.channels.cache.find(c => c.name === "ceitus-updates") ??
      guild.channels.cache.find(c => c.name === "ceitus-roblox-descargar");
    if (!channel) {
      console.error("Canal no encontrado. Disponibles:", [...guild.channels.cache.values()].filter(c=>c.type===0).map(c=>c.name).join(", "));
      return;
    }

    const { EmbedBuilder } = require("discord.js");
    const embed = new EmbedBuilder()
      .setTitle("🔄  Roblox se actualizó — Ceitus en Mantenimiento")
      .setColor(0xFF8800)
      .addFields(
        { name: "📌  Versión anterior", value: `\`${OLD_VERSION}\``, inline: true },
        { name: "✅  Versión nueva",    value: `\`${NEW_VERSION}\``, inline: true },
        { name: "⚙️  Estado",          value: "🔴 **En mantenimiento**", inline: false }
      )
      .setFooter({ text: "Ceitus Roblox External • Monitor automático" })
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    fs.writeFileSync(VERSION_FILE, NEW_VERSION, "utf8");
    console.log("Notificación enviada al canal:", channel.name);
  } catch (e) {
    console.error(e);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
