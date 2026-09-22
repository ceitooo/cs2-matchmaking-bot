require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

function buildEmbed() {
  return new EmbedBuilder()
    .setTitle("🔵 Ceitus v1.0.5 — Update")
    .setColor(0x5865f2)
    .setDescription("**Nuevas funciones, fix de aimbot y mejoras de estabilidad.**")
    .addFields(
      {
        name: "🎯 Filtro de Usuarios",
        value: "Ahora puedes elegir a que jugadores especificos quieres ver en el ESP y aimbot. Ideal para 1v1, 5v5 o cuando quieras trackear a alguien en particular."
      },
      {
        name: "🔧 Fix Aimbot",
        value: "Se corrigio el rebote del aimbot. Ahora se mantiene estable en la cabeza sin oscilar."
      },
      {
        name: "🛡️ Anti-AFK",
        value: "Nuevo modo Anti-AFK: simula actividad para que Roblox no te saque por estar idle."
      },
      {
        name: "⚡ Fix Estabilidad",
        value: "Se corrigio el bug donde el programa quedaba invisible despues de mucho tiempo. Recuperacion automatica del render."
      },
      {
        name: "🔑 Panic Key Personalizable",
        value: "La tecla de panico ahora se puede configurar con cualquier tecla."
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
