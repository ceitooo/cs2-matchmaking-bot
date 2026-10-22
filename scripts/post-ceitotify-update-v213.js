require("dotenv").config();
const path = require("path");
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const LOGO = path.join(__dirname, "..", "assets", "ceitotify-v200-logo.png");

function buildEmbed() {
  return new EmbedBuilder()
    .setTitle("🎧 Ceitotify v2.1.3 — Update")
    .setColor(0xd7dbe2)
    .setDescription("**Mucho menos lag y arreglos.**")
    .addFields(
      {
        name: "⚡ Menos lag",
        value: "Spotify ya no se traba al mover el mouse: las opciones de Ocultar dejaron de revisar la pagina en cada cambio, y los temas Neon cambian de color sin trabar."
      },
      {
        name: "🌠 Estela del cursor nueva",
        value: "Ahora es una linea continua que se desvanece: ya no se corta cuando moves el mouse rapido y pesa mucho menos."
      },
      {
        name: "⏭️ Arreglado el salto infinito",
        value: "Anti repetidas y Saltar canciones cortas ya no saltan canciones sin parar: como maximo 3 seguidas, y nunca despues de tocar Anterior."
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
