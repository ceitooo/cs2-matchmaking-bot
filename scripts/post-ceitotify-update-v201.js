require("dotenv").config();
const path = require("path");
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const LOGO = path.join(__dirname, "..", "assets", "ceitotify-v201-logo.png");

function buildEmbed() {
  return new EmbedBuilder()
    .setTitle("🎧 Ceitotify v2.0.1 — Update")
    .setColor(0xd7dbe2)
    .setDescription("**Market gigante, cat-jam al ritmo y arreglos.**")
    .addFields(
      {
        name: "🛍️ Market con 98 extensiones",
        value: "Se sumaron mas de 70 extensiones de la comunidad, todas verificadas y con descripcion en español. Letras estilo Apple Music (Beautiful Lyrics, Spicy Lyrics), mas canciones con letra, calificar con estrellas, escuchar juntos en sincronia, controlar Spotify con joystick y mucho mas."
      },
      {
        name: "🐱 Cat-jam arreglado",
        value: "El gato vuelve a bailar al ritmo de la cancion (Spotify dejo de dar el tempo, ahora Ceitotify lo busca solo) y ya no queda oculto si tenes activado 'Ocultar videos musicales'."
      },
      {
        name: "🎲 Sorprendeme arreglado",
        value: "Vuelve a poner una cancion random: elige entre 20 playlists grandes de distintos estilos."
      },
      {
        name: "🔧 Arreglos varios",
        value: "Particulas del fondo animado visibles y flotando como burbujas, foto de perfil personalizada al instante y otras mejoras."
      }
    )
    .setImage("attachment://ceitotify-v201-logo.png")
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

    const file = new AttachmentBuilder(LOGO, { name: "ceitotify-v201-logo.png" });
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
