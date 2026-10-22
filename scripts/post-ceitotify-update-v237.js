require("dotenv").config();
const path = require("path");
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const LOGO = path.join(__dirname, "..", "assets", "ceitotify-v230-logo.png");

function buildEmbed() {
  return new EmbedBuilder()
    .setTitle("🎧 Ceitotify v2.3.7 — Update")
    .setColor(0xa78bfa)
    .setDescription("**El logo de Ceitotify llega a la bandeja de Windows.**")
    .addFields(
      {
        name: "🎨 Icono de la bandeja",
        value: "El icono de Spotify al lado del reloj (en la flechita de la barra de tareas) ahora es el logo de Ceitotify."
      },
      {
        name: "📥 Como actualizar",
        value: "Abri CeitoTweaks y reinstala Ceitotify. Si Spotify te queda en gris, usa el boton Arreglar Ceitotify."
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
