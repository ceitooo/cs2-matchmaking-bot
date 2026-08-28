require("dotenv").config();
const { Client, GatewayIntentBits, ChannelType } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const channels = await guild.channels.fetch();

    const rulesChannel = channels.find((c) => c.type === ChannelType.GuildText && c.name === "📜・reglas-y-elo");
    if (!rulesChannel) {
      console.log("No se encontró el canal de reglas.");
      return;
    }

    const verifyChannel = channels.find((c) => c.name === "✅・verificacion" || c.name === "✅・verificar-steam");

    const newContent =
      "**Cómo funciona el server**\n\n" +
      "**1. Verifica tu cuenta de Steam**\n" +
      `Usa el botón en ${verifyChannel ? `<#${verifyChannel.id}>` : "el canal de verificación"} — es obligatorio para poder jugar, evita cuentas falsas.\n\n` +
      "**2. Elige cómo quieres jugar**\n" +
      "• `/panel` — crea una **sala personalizada**: eliges tu equipo (A o B, sin balanceo automático), puedes ponerle nombre a los equipos, y pegas el código de matchmaking privado de CS2. Cuando todos marcan ✅ Listo, se crean canales de voz automáticamente.\n" +
      "• `/premier` — cola rápida de **5 jugadores** para Premier.\n" +
      "• `/compe` — cola rápida de **5 jugadores** para Competitivo.\n" +
      "• `/duo` — cola rápida de **2 jugadores**.\n" +
      "En las colas rápidas, al completarse se crea un canal de voz temporal y se borra solo cuando todos salen.\n\n" +
      "**3. Administra tu sala**\n" +
      "Quien crea la sala puede expulsar jugadores, ponerle nombre a los equipos y finalizarla cuando quiera. Las salas sin actividad se avisan a los 15 min y se cierran solas a los 30 min.\n\n" +
      "**4. Estadísticas**\n" +
      "• `/stats` — tu ELO, victorias/derrotas e insignias en el server.\n" +
      "• `/steam-stats` — tus stats reales de CS2 (Steam), FACEIT y Leetify.\n\n" +
      "_El ELO es informativo: los admins pueden ajustarlo manualmente con `/resultado` si quieren llevar un ranking, pero las salas normales no lo suben/bajan automáticamente._";

    const messages = await rulesChannel.messages.fetch({ limit: 10 });
    const botMessage = messages.find((m) => m.author.id === client.user.id);

    if (botMessage) {
      await botMessage.edit(newContent);
      console.log("Mensaje de reglas actualizado.");
    } else {
      await rulesChannel.send(newContent);
      console.log("No había mensaje previo, se envió uno nuevo.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
