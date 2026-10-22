require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

function buildEmbed() {
  return new EmbedBuilder()
    .setTitle("🔵 Ceitus v1.0.5 — Update")
    .setColor(0x5865f2)
    .setDescription("**Fix aimbot, conexión, esqueletos y noclip.**")
    .addFields(
      {
        name: "🎯 Fix Aimbot",
        value: "Se elimino el rebote. El aimbot ahora se mantiene estable en la cabeza y la sigue con precision sin oscilar."
      },
      {
        name: "🔗 Fix Conexion",
        value: "Se corrigio el bug donde mostraba 'Sin Roblox' incluso con Roblox abierto."
      },
      {
        name: "💀 Fix Esqueletos",
        value: "Los huesos ahora son siempre visibles, sin desaparecer al moverse el jugador."
      },
      {
        name: "👻 Noclip",
        value: "Nuevo modo Noclip: atraviesa paredes activandolo desde el menu."
      }
    )
    .setFooter({ text: "Ceitus • Novedades & Actualizaciones" })
    .setTimestamp();
}

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.channels.fetch();

    const channel =
      guild.channels.cache.find(c => c.name === "ceitus-roblox") ??
      guild.channels.cache.find(c => c.name && c.name.includes("roblox") && !c.name.includes("descargar") && !c.name.includes("ventas") && !c.name.includes("updates"));

    if (!channel) {
      const available = [...guild.channels.cache.values()].filter(c => c.type === 0).map(c => c.name).join(", ");
      console.error("Canal ceitus-roblox no encontrado. Disponibles:", available);
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
