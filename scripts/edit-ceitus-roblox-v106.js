require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

function buildEmbed() {
  return new EmbedBuilder()
    .setTitle("🔵 Ceitus v1.0.6 — Update")
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
    if (!channel) { console.error("Canal no encontrado"); return; }

    // Buscar mensajes recientes del bot con título v1.0.5
    const msgs = await channel.messages.fetch({ limit: 20 });
    const botMsgs = msgs.filter(m =>
      m.author.id === client.user.id &&
      m.embeds.length > 0 &&
      m.embeds[0].title &&
      m.embeds[0].title.includes("v1.0.5") &&
      m.embeds[0].description &&
      m.embeds[0].description.includes("Fly")
    );

    const sorted = [...botMsgs.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    console.log(`Encontrados ${sorted.length} mensajes v1.0.5 con Fly`);

    // Editar el primero a v1.0.6
    if (sorted[0]) {
      await sorted[0].edit({ embeds: [buildEmbed()] });
      console.log("Editado mensaje:", sorted[0].id);
    }

    // Borrar los duplicados (todos excepto el primero)
    for (let i = 1; i < sorted.length; i++) {
      await sorted[i].delete();
      console.log("Borrado duplicado:", sorted[i].id);
    }

    console.log("Listo.");
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
