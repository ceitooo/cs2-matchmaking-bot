require("dotenv").config();
const path = require("path");
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const LOGO = path.join(__dirname, "..", "assets", "ceitotify-v230-logo.png");

function buildEmbed() {
  return new EmbedBuilder()
    .setTitle("🎧 Ceitotify v2.3.0 — Update")
    .setColor(0xa78bfa)
    .setDescription("**Logo nuevo, intro con sonido y menu renovado.**")
    .addFields(
      {
        name: "🎵 Logo nuevo: Pulso",
        value: "Una C con barras de ecualizador. Aparece arriba a la izquierda de Spotify y las barras bailan con la musica; tocalo para abrir el menu. Se apaga en Menu (Ctrl+A) > Plugins > Decoraciones."
      },
      {
        name: "🚀 Intro nueva con sonido",
        value: "La C se dibuja, las barras saltan y bailan mientras carga Spotify, con un sonido corto. El sonido se apaga en Extras > Sistema."
      },
      {
        name: "🎛️ Menu renovado",
        value: "Iconos propios en todo el menu y la tarjeta de Sonando ahora con la portada de fondo y controles nuevos."
      },
      {
        name: "💜 Tema nuevo gratis: Pulso (firma)",
        value: "Negro indigo con el degradado violeta y cian del logo en el play y en la barra de progreso."
      },
      {
        name: "🌠 Estela del cursor arreglada (Premium)",
        value: "Ahora se dibuja de verdad y mas suave."
      },
      {
        name: "⚡ Mas rapido",
        value: "El menu pesa 150 KB menos, asi que Spotify arranca mas liviano."
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
