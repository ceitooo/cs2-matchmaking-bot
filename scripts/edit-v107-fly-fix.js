require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

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
    if (!channel) { console.error("Canal no encontrado"); process.exit(1); }

    const msgs = await channel.messages.fetch({ limit: 30 });
    const botMsgs = [...msgs.filter(m => m.author.id === client.user.id && m.embeds.length > 0).values()];

    const msg107 = botMsgs.find(m =>
      m.embeds[0].title && m.embeds[0].title.includes("1.0.7")
    );

    if (msg107) {
      await msg107.edit({ embeds: [embedV107()] });
      console.log("Editado v1.0.7:", msg107.id);
    } else {
      // No existe aún, posteamos nuevo
      await channel.send({ embeds: [embedV107()] });
      console.log("Posteado nuevo mensaje v1.0.7");
    }
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
