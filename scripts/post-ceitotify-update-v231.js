require("dotenv").config();
const path = require("path");
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const LOGO = path.join(__dirname, "..", "assets", "ceitotify-v230-logo.png");

function buildEmbed() {
  return new EmbedBuilder()
    .setTitle("🎧 Ceitotify v2.3.1 — Update")
    .setColor(0xa78bfa)
    .setDescription("**Atajos globales y la intro sin trabas.**")
    .addFields(
      {
        name: "⌨️ Atajos globales",
        value: "Tus atajos de Bindear ahora andan aunque Spotify este minimizado o en segundo plano: pausa o salta canciones desde el juego, el navegador o donde estes. La pestaña Bindear te marca cuales son globales."
      },
      {
        name: "🔤 Teclas solas (ej: H)",
        value: "Andan desde cualquier lado y la letra se sigue escribiendo en las otras apps (si la tipeas en un chat, tambien se activa). Si no te gusta, cambiala por una combinacion con Ctrl, Alt o Win (ej: Ctrl+Alt+P)."
      },
      {
        name: "🚀 Intro y logo sin trabas",
        value: "La intro y el logo animado ahora se animan con la GPU, asi que ya no se traban mientras carga Spotify."
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
