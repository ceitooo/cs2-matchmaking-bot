require("dotenv").config();
const path = require("path");
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const LOGO = path.join(__dirname, "..", "assets", "ceitotify-v200-logo.png");

function buildEmbed() {
  return new EmbedBuilder()
    .setTitle("🎧 Ceitotify v2.0.2 — Update")
    .setColor(0xd7dbe2)
    .setDescription("**Market gigante, cat-jam al ritmo y una intro mas prolija.** (Incluye todo lo de la 2.0.1.)")
    .addFields(
      {
        name: "🛍️ Market: 98 extensiones",
        value: "Letras estilo Apple Music (Beautiful y Spicy Lyrics), mas letras para mas canciones, letras flotantes, calificar con estrellas, escuchar juntos con amigos, controlar Spotify con joystick, saltar partes de canciones y muchas mas."
      },
      {
        name: "🐱 Cat-Jam arreglado",
        value: "El gato vuelve a bailar al ritmo de la cancion y ya no desaparece si tenes activado Ocultar videos."
      },
      {
        name: "🚀 Intro mas prolija",
        value: "La intro espera a que Spotify termine de cargar y este fluido antes de irse, asi ya no se ve trabado al abrir."
      },
      {
        name: "🎲 Sorprendeme",
        value: "Vuelve a funcionar: elige una cancion random de playlists grandes de todos los estilos."
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
