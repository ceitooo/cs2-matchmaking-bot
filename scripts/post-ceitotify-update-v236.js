require("dotenv").config();
const path = require("path");
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const LOGO = path.join(__dirname, "..", "assets", "ceitotify-v230-logo.png");

function buildEmbed() {
  return new EmbedBuilder()
    .setTitle("🎧 Ceitotify v2.3.6 — Update")
    .setColor(0xa78bfa)
    .setDescription("**Spotify en gris con \"Volver a cargar la pagina\": encontrada la causa.**")
    .addFields(
      {
        name: "🛠️ Que pasaba",
        value: "En algunas PCs la instalacion dejaba a Spotify sin algunos de sus propios archivos, y por eso no terminaba de cargar."
      },
      {
        name: "✅ Arreglo",
        value: "El instalador ahora revisa que Spotify tenga todos sus archivos y repone solo los que falten."
      },
      {
        name: "📥 Como actualizar",
        value: "Abri CeitoTweaks y reinstala Ceitotify. Si seguis con problemas, corre diagnostico-ceitotify.bat y manda el archivo que queda en el Escritorio."
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
