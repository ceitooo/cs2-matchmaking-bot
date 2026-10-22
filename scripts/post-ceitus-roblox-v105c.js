require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

function buildEmbed() {
  return new EmbedBuilder()
    .setTitle("🔵 Ceitus v1.0.5 — Update")
    .setColor(0x5865f2)
    .setDescription("**Fly, fix noclip y fix Anti-AFK.**")
    .addFields(
      {
        name: "🦅 Fly",
        value: "Nuevo modo vuelo: mantén Space para subir, Shift para bajar. Al soltar flotás en el aire. Velocidad configurable desde el menú."
      },
      {
        name: "👻 Fix Noclip",
        value: "Se corrigió el bug donde el noclip te enviaba para atrás. Ahora cancela el impulso de rebote automáticamente."
      },
      {
        name: "🛡️ Fix Anti-AFK",
        value: "El Anti-AFK ahora funciona en segundo plano sin necesitar tener Roblox en foco. Usa un micro-movimiento interno que el servidor detecta como actividad."
      }
    )
    .setFooter({ text: "Ceitus • Novedades & Actualizaciones" })
    .setTimestamp();
}

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.channels.fetch();

    const channel = guild.channels.cache.find(c => c.name === "ceitus-roblox");
    if (!channel) {
      const available = [...guild.channels.cache.values()].filter(c => c.type === 0).map(c => c.name).join(", ");
      console.error("Canal no encontrado. Disponibles:", available);
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
