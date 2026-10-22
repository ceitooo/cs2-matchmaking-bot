require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

function embedV106() {
  return new EmbedBuilder()
    .setTitle("🔵 Ceitus v1.0.6 — Update")
    .setColor(0x5865f2)
    .setDescription("**Fix aimbot, conexión, esqueletos y noclip.**")
    .addFields(
      { name: "🎯 Fix Aimbot", value: "Se elimino el rebote. El aimbot ahora se mantiene estable en la cabeza y la sigue con precision sin oscilar." },
      { name: "🔗 Fix Conexion", value: "Se corrigio el bug donde mostraba 'Sin Roblox' incluso con Roblox abierto." },
      { name: "💀 Fix Esqueletos", value: "Los huesos ahora son siempre visibles, sin desaparecer al moverse el jugador." },
      { name: "👻 Noclip", value: "Nuevo modo Noclip: atraviesa paredes activandolo desde el menu." }
    )
    .setFooter({ text: "Ceitus • Novedades & Actualizaciones" })
    .setTimestamp();
}

function embedV107() {
  return new EmbedBuilder()
    .setTitle("🔵 Ceitus v1.0.7 — Update")
    .setColor(0x5865f2)
    .setDescription("**Fly, fix noclip y fix Anti-AFK.**")
    .addFields(
      { name: "🦅 Fly", value: "Nuevo modo vuelo: mantén Space para subir, Shift para bajar. Al soltar flotás en el aire. Velocidad configurable desde el menú." },
      { name: "👻 Fix Noclip", value: "Se corrigió el bug donde el noclip te enviaba para atrás. Ahora cancela el impulso de rebote automáticamente." },
      { name: "🛡️ Fix Anti-AFK", value: "El Anti-AFK ahora funciona en segundo plano sin necesitar tener Roblox en foco. Usa un micro-movimiento interno que el servidor detecta como actividad." }
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

    const msgs = await channel.messages.fetch({ limit: 30 });
    const botMsgs = [...msgs.filter(m => m.author.id === client.user.id && m.embeds.length > 0).values()];

    // Mensaje con "Fix aimbot" en descripción → editar a v1.0.6
    const msg106 = botMsgs.find(m => m.embeds[0].description && m.embeds[0].description.toLowerCase().includes("aimbot") && m.embeds[0].description.toLowerCase().includes("noclip") && !m.embeds[0].description.toLowerCase().includes("fly"));
    if (msg106) {
      await msg106.edit({ embeds: [embedV106()] });
      console.log("Editado a v1.0.6:", msg106.id);
    } else {
      console.log("No encontrado mensaje para v1.0.6");
    }

    // Mensaje con "Fly" en descripción → editar a v1.0.7
    const msg107 = botMsgs.find(m => m.embeds[0].description && m.embeds[0].description.toLowerCase().includes("fly"));
    if (msg107) {
      await msg107.edit({ embeds: [embedV107()] });
      console.log("Editado a v1.0.7:", msg107.id);
    } else {
      console.log("No encontrado mensaje para v1.0.7");
    }

  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
