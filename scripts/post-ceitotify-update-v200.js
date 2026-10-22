require("dotenv").config();
const path = require("path");
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const LOGO = path.join(__dirname, "..", "assets", "ceitotify-v200-logo.png");

function buildEmbed() {
  return new EmbedBuilder()
    .setTitle("🎧 Ceitotify v2.0 — Update")
    .setColor(0xd7dbe2)
    .setDescription("**La actualizacion mas grande de Ceitotify: interfaz nueva, logo nuevo y muchisimas funciones.**")
    .addFields(
      {
        name: "✨ Interfaz rediseñada",
        value: "Menu nuevo con barra lateral, buscador y animaciones. Ahora toma los colores del tema que tengas puesto. Logo nuevo: la C con auriculares."
      },
      {
        name: "🚀 Intro animada",
        value: "Animacion plateada del logo al abrir Spotify (se puede apagar en Extras)."
      },
      {
        name: "🧩 Extras: 38 plugins nuevos",
        value: "Color dinamico segun la portada, temporizador de sueño, pomodoro, despertador musical, protector de pantalla, saltar canciones cortas, volumen nocturno, logros, nieve, confeti y mucho mas."
      },
      {
        name: "🤝 Colaboraciones",
        value: "Nuevo apartado de temas hechos con otras personas. El primero: **My Melody by jugluc**, rosa pastel con My Melody acompañandote en la esquina."
      },
      {
        name: "🎨 Temas",
        value: "11 temas nuevos (Ceitotify, Dracula, Nord, Catppuccin, Tokyo Night, Rose Pine y mas) y todos los temas existentes mejorados."
      },
      {
        name: "⌨️ Paleta de comandos",
        value: "Ctrl+K para buscar y ejecutar cualquier cosa: temas, plugins, reproduccion y navegacion."
      },
      {
        name: "⚡ Rendimiento y arreglos",
        value: "Mucho menos lag, fondo personalizado sin pixelado, Sorprendeme funcionando de nuevo, particulas del fondo animado visibles y foto de perfil al instante."
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
