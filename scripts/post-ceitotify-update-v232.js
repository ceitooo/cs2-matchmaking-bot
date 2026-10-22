require("dotenv").config();
const path = require("path");
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const LOGO = path.join(__dirname, "..", "assets", "ceitotify-v230-logo.png");

function buildEmbed() {
  return new EmbedBuilder()
    .setTitle("🎧 Ceitotify v2.3.2 — Update")
    .setColor(0xa78bfa)
    .setDescription("**Spotify ahora es Ceitotify.**")
    .addFields(
      {
        name: "🖥️ Acceso directo",
        value: "El acceso de Spotify del escritorio y del menu Inicio pasa a llamarse Ceitotify y tiene el logo nuevo. Abre Spotify normal."
      },
      {
        name: "🛠️ Arreglado el acceso viejo",
        value: "Si tenias un acceso \"Ceitotify\" que cerraba Spotify y no lo volvia a abrir, ya quedo arreglado."
      },
      {
        name: "📌 Barra de tareas",
        value: "Con Spotify abierto, el boton de la barra de tareas muestra el logo de Ceitotify, y la ventana se llama Ceitotify cuando no esta sonando nada."
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
