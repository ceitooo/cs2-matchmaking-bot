require("dotenv").config();
const path = require("path");
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const LOGO = path.join(__dirname, "..", "assets", "ceitotify-v200-logo.png");

function buildEmbed() {
  return new EmbedBuilder()
    .setTitle("🎧 Ceitotify v2.2.0 — Update")
    .setColor(0xd7dbe2)
    .setDescription("**Nueva pestaña: Bindear.**")
    .addFields(
      {
        name: "🎹 Tus propias teclas",
        value: "Asigna cualquier tecla o combinacion (ej: H, Ctrl+H) a 19 acciones: pausar, siguiente, anterior, adelantar/atrasar 10s, volumen, silenciar, aleatorio, repetir, Me gusta, copiar link, Sorprendeme, tema al azar, abrir el menu de Ceitotify, Inicio, Buscar, Biblioteca y Me gusta."
      },
      {
        name: "⌨️ Como se usa",
        value: "Menu de Ceitotify > Bindear > Asignar, y apreta la tecla. Esc cancela y la X la quita. No se activan mientras escribis en el buscador."
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
