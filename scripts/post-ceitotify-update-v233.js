require("dotenv").config();
const path = require("path");
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const LOGO = path.join(__dirname, "..", "assets", "ceitotify-v230-logo.png");

function buildEmbed() {
  return new EmbedBuilder()
    .setTitle("🎧 Ceitotify v2.3.3 — Update")
    .setColor(0xa78bfa)
    .setDescription("**Arreglado Spotify trabado al cargar.**")
    .addFields(
      {
        name: "🛠️ Spotify en gris con \"Volver a cargar la pagina\"",
        value: "Con la ultima version de Spotify (1.3.4), el bloqueador de anuncios podia dejar Spotify trabado en las tarjetas grises. Ya esta arreglado, y ademas deja de consumir procesador en segundo plano."
      },
      {
        name: "🚀 Intro sin trabas",
        value: "La intro se ve fluida mientras Spotify arranca y el sonido va sincronizado con la animacion."
      },
      {
        name: "🎵 Logo de arriba",
        value: "El logo de Ceitotify vuelve a aparecer arriba a la izquierda en Spotify 1.3.4."
      },
      {
        name: "🔍 Si algo sigue fallando",
        value: "Corre diagnostico-ceitotify.bat y manda el archivo que queda en el Escritorio: ahora incluye los errores de la carga de Spotify."
      }
    )
    .setImage("attachment://ceitotify-v230-logo.png")
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

    const file = new AttachmentBuilder(LOGO, { name: "ceitotify-v230-logo.png" });
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
