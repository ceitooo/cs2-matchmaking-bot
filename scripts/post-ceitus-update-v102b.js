require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

function buildEmbed() {
  return new EmbedBuilder()
    .setTitle("🔵 Ceitus v1.0.2 — Patch")
    .setColor(0x5865f2)
    .setDescription("**Se corrigieron errores y se rediseño la interfaz completa.**")
    .addFields(
      {
        name: "🎨 GUI Rediseñada",
        value: "Interfaz completamente nueva: ventana sin bordes, header con gradiente, botones de cerrar/minimizar personalizados, y diseño premium en todas las pantallas (login, menu, info)."
      },
      {
        name: "⚡ ESP Skeleton 200Hz",
        value: "Los huesos del esqueleto ahora se actualizan a 200Hz (antes 60Hz). Mucho mas fluido y pegado al cuerpo en tiempo real."
      },
      {
        name: "🔄 Boton de Actualizar",
        value: "El boton de auto-update ahora funciona correctamente. Las nuevas versiones se descargan e instalan automaticamente."
      },
      {
        name: "🔧 Version Corregida",
        value: "Se corrigio el numero de version interno que no coincidia con el release."
      }
    )
    .setFooter({ text: "Ceitus • Novedades & Actualizaciones" })
    .setTimestamp();
}

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.channels.fetch();

    const channel = guild.channels.cache.find(
      (c) => c.name && c.name.toLowerCase().includes("ceitus-updates")
    );

    if (!channel) {
      console.error("Canal ceitus-updates no encontrado.");
      return;
    }

    await channel.send({ embeds: [buildEmbed()] });
    console.log("Publicado en:", channel.name);
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
