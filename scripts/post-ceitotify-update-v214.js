require("dotenv").config();
const path = require("path");
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const LOGO = path.join(__dirname, "..", "assets", "ceitotify-v200-logo.png");

function buildEmbed() {
  return new EmbedBuilder()
    .setTitle("🎧 Ceitotify v2.1.4 — Update")
    .setColor(0xd7dbe2)
    .setDescription("**El mayor arreglo de lag hasta ahora.**")
    .addFields(
      {
        name: "⚡ Spotify mucho mas fluido",
        value: "Encontramos un error de Spicetify que, con Spotify 1.3, revisaba toda la pagina cada vez que algo cambiaba. Ceitotify ahora lo corrige solo al instalarse y despues de cada actualizacion de Spotify. En nuestras pruebas, Spotify hace casi 5 veces menos trabajo."
      },
      {
        name: "🔔 Avisos",
        value: "Los avisos de Ceitotify se ven siempre, incluso los del arranque."
      },
      {
        name: "📥 Como actualizar",
        value: "Abri CeitoTweaks > Programas > Ceitotify > Actualizar."
      }
    )
    .setImage("attachment://ceitotify-v200-logo.png")
    .setFooter({ text: "Ceitotify • Instala la actualizacion desde CeitoTweaks" })
    .setTimestamp();
}

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.channels.fetch();

    const channel = guild.channels.cache.find(
      (c) => c.name && c.name.toLowerCase().includes("ceitotify-updates")
    );

    if (!channel) {
      console.error("Canal ceitotify-updates no encontrado.");
      return;
    }

    const file = new AttachmentBuilder(LOGO, { name: "ceitotify-v200-logo.png" });
    await channel.send({ embeds: [buildEmbed()], files: [file] });
    console.log("Publicado en:", channel.name);
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
