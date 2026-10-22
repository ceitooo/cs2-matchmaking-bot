require("dotenv").config();
const path = require("path");
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const LOGO = path.join(__dirname, "..", "assets", "ceitotify-v200-logo.png");

function buildEmbed() {
  return new EmbedBuilder()
    .setTitle("🎧 Ceitotify v2.1.0 — ¡Ahora es gratis!")
    .setColor(0xd7dbe2)
    .setDescription("**Ceitotify ahora es gratis para todos.** Instalalo desde CeitoTweaks (actualizá a la 1.7.37) en Programas > Ceitotify.")
    .addFields(
      {
        name: "🆓 Gratis",
        value: "Interfaz completa, 9 temas, Colaboraciones (My Melody by jugluc), 10 Extras, el Market con 98 extensiones, Plugins de limpieza, Fuentes y el bloqueador de anuncios."
      },
      {
        name: "⭐ Con CeitoTweaks Premium",
        value: "+38 temas, +28 Extras (temporizador de sueño, color dinamico, pomodoro, logros...), fondo personalizado con imagen o GIF, icono propio, estadisticas y paleta de comandos (Ctrl+K)."
      },
      {
        name: "🌈 Nuevo: Efectos (Premium)",
        value: "Una pestaña nueva con particulas flotantes, nieve, estela del cursor, confeti al dar Me gusta, portada tipo vinilo y brillo ambiental."
      },
      {
        name: "🔄 Automatico",
        value: "Si activas Premium, Ceitotify se actualiza solo y se desbloquea todo. Lo premium se ve con candado en la version gratis."
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
