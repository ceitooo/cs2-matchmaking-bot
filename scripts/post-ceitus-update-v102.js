require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

function buildEmbed() {
  return new EmbedBuilder()
    .setTitle("🔵 Ceitus Roblox v1.0.2")
    .setColor(0x5865f2)
    .setDescription("**Actualización v1.0.2: ESP optimizado, sin lag y fix de aimbot**")
    .addFields(
      {
        name: "• ESP Thread Independiente",
        value: "Las lecturas de memoria corren en un hilo separado a 120Hz, liberando el render completamente."
      },
      {
        name: "• Posición en Tiempo Real",
        value: "La posición de cada jugador se actualiza cada frame usando un puntero directo, sin llamadas extra."
      },
      {
        name: "• Cache de Pens GDI",
        value: "Se eliminan cientos de creaciones/destrucciones de objetos gráficos por frame, reduciendo el overhead."
      },
      {
        name: "• Fix Aimbot Bounce",
        value: "Corregida la oscilación del aimbot al apuntar — ya no rebota entre frames."
      }
    )
    .setFooter({ text: "Ceitus Roblox • Novedades & Actualizaciones" })
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
