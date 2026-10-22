require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

function embedV109() {
  return new EmbedBuilder()
    .setTitle("🔵 Ceitus v1.0.9 — Roblox External")
    .setColor(0x5865f2)
    .setDescription("**Aimbot 3x más rápido, FOV circle, snap indicator y fly.**")
    .addFields(
      { name: "🎯 Aimbot más rápido", value: "El aimbot se pega a la cabeza casi instantáneo. 3x más rápido que antes." },
      { name: "⭕ FOV Circle", value: "Círculo de FOV que sigue tu cursor en todo momento. Se pone verde cuando hay lock. Funciona aunque tengas el ESP apagado." },
      { name: "📍 Snap Indicator", value: "Cuando el aimbot tiene un target, aparece un punto verde en la cabeza y una línea desde el cursor hasta ahí. Ahora sigue la posición exacta." },
      { name: "🦅 Fly (F/C)", value: "Mantén **F** para subir y **C** para bajar. Velocidad configurable. Teclas cambiables desde el menú." },
      { name: "👻 Noclip & Anti-AFK", value: "Noclip corregido. Anti-AFK funciona en segundo plano sin enfocar Roblox." }
    )
    .setFooter({ text: "Ceitus • Novedades & Actualizaciones" })
    .setTimestamp();
}

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.find(c => c.name === "ceitus-roblox");
    if (!channel) { console.error("Canal no encontrado"); process.exit(1); }

    // Buscar mensaje viejo de v1.0.5 para editar
    const msgs = await channel.messages.fetch({ limit: 50 });
    const botMsgs = [...msgs.filter(m => m.author.id === client.user.id && m.embeds.length > 0).values()];

    const msgOld = botMsgs.find(m =>
      m.embeds[0].title && (
        m.embeds[0].title.includes("1.0.5") ||
        m.embeds[0].title.includes("1.0.7") ||
        m.embeds[0].title.includes("1.0.8")
      )
    );

    if (msgOld) {
      await msgOld.edit({ embeds: [embedV109()] });
      console.log("Editado mensaje viejo a v1.0.9:", msgOld.id);
    } else {
      await channel.send({ embeds: [embedV109()] });
      console.log("Posteado nuevo mensaje v1.0.9");
    }
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
