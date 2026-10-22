require("dotenv").config();
const path = require("path");
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const LOGO = path.join(__dirname, "..", "assets", "ceitotify-v230-logo.png");

function buildEmbed() {
  return new EmbedBuilder()
    .setTitle("🎧 Ceitotify v2.3.4 — Update")
    .setColor(0xa78bfa)
    .setDescription("**Arreglado de verdad: Spotify trabado en gris al abrir.**")
    .addFields(
      {
        name: "🛠️ Tarjetas grises con \"Volver a cargar la pagina\"",
        value: "A varios les seguia pasando con Spotify 1.3.4: el motor de parcheo rompia la carga de Spotify. Ahora el instalador lo corrige y Spotify abre normal."
      },
      {
        name: "🔁 Intro que se repetia",
        value: "La intro de Ceitotify ya no se carga varias veces seguidas al abrir Spotify."
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
