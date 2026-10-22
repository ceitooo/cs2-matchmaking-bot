require("dotenv").config();
const path = require("path");
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const LOGO = path.join(__dirname, "..", "assets", "ceitotify-v200-logo.png");

function buildEmbed() {
  return new EmbedBuilder()
    .setTitle("🎧 Ceitotify v2.1.1 — Update")
    .setColor(0xd7dbe2)
    .setDescription("**Premium mas claro y una intro con vida.**")
    .addFields(
      {
        name: "⭐ Nueva pestaña Premium",
        value: "Con logo animado, todos los beneficios y un boton que te lleva directo a los planes en CeitoTweaks."
      },
      {
        name: "🔒 Mira antes de desbloquear",
        value: "Los temas, Extras y Efectos premium ahora se ven con candado: podes ver cada uno antes de conseguir Premium."
      },
      {
        name: "🚀 Intro con progreso real",
        value: "La barra de carga avanza de verdad mientras Spotify arranca, con un brillo y mensajes, y se completa antes de irse."
      },
      {
        name: "🔔 Avisos arreglados",
        value: "Vuelven a verse todos los avisos de Ceitotify (tema aplicado, copiado, etc.), que no aparecian en Spotify actual."
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
