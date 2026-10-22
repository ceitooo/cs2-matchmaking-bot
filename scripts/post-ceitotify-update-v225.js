require("dotenv").config();
const path = require("path");
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const LOGO = path.join(__dirname, "..", "assets", "ceitotify-v200-logo.png");

function buildEmbed() {
  return new EmbedBuilder()
    .setTitle("🎧 Ceitotify v2.2.5 — Update")
    .setColor(0xd7dbe2)
    .setDescription("**Tu perfil, a tu manera.**")
    .addFields(
      {
        name: "🏞️ Banner del perfil",
        value: "Pone tu propia imagen en lugar del fondo gris de tu perfil. Menu (Ctrl+A) > Plugins > Elegir banner del perfil."
      },
      {
        name: "👤 Tu foto en tu perfil",
        value: "Tu foto de Ceitotify vuelve a verse en tu perfil con Spotify 1.3.3, y ya no cambia la foto del perfil de otras personas."
      },
      {
        name: "🎞️ Fotos gratis, GIF Premium",
        value: "Las fotos del boton y del banner son gratis para todos. Los GIF animados son Premium."
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
