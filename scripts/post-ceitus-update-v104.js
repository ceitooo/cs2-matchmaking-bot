require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

function buildEmbed() {
  return new EmbedBuilder()
    .setTitle("🔵 Ceitus v1.0.4 — Update")
    .setColor(0x5865f2)
    .setDescription("**Nuevas funciones, optimizaciones y fix de estabilidad.**")
    .addFields(
      {
        name: "🛡️ Anti-AFK",
        value: "Nuevo modo Anti-AFK: simula actividad para que Roblox no te saque por estar idle. Activalo desde el menu."
      },
      {
        name: "🎯 Aimbot Mejorado",
        value: "El aimbot ahora se pega mas al target con ganancia no lineal y boost por distancia. Deadzone reducido para mejor precision."
      },
      {
        name: "⚡ Rendimiento Optimizado",
        value: "Bhop y otros sistemas ahora usan punteros cacheados. Menos lecturas de memoria = mas FPS."
      },
      {
        name: "🔧 Fix Ventana Invisible",
        value: "Se corrigio el bug donde despues de mucho tiempo el programa quedaba invisible. Ahora se recupera automaticamente."
      },
      {
        name: "🔑 Panic Key Personalizable",
        value: "La tecla de panico ahora se puede configurar con cualquier tecla, igual que la tecla del menu."
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
