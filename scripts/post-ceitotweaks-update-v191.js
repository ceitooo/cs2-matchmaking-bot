// Anuncio de CeitoTweaks v1.9.1 (boton Arreglar Ceitotify) en
// #ceitotweaks-updates y #ceitotify-updates, con ping al rol de cada uno.
require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const CAMBIOS = [
  "**🔧 Nuevo boton: Arreglar Ceitotify**",
  "Si tu Spotify queda en gris con \"Volver a cargar la pagina\", en **Programas → Ceitotify** ahora tenes el boton **Arreglar Ceitotify** al lado de Instalar.",
  "",
  "Reinstala Spotify limpio y vuelve a instalar Ceitotify solo, en un par de minutos. Tu sesion, playlists y Me gusta se mantienen (las canciones descargadas sin conexion se borran).",
  "",
  "**Que pasaba:** con Spotify 1.3.4, en algunas PCs la copia de Spotify que guarda el parche era de una version vieja y no coincidia con el Spotify nuevo, asi que le faltaban archivos y no terminaba de cargar.",
  "",
  "Actualiza CeitoTweaks desde la app o descargalo de nuevo."
].join("\n");

const DESTINOS = [
  { channel: "ceitotweaks-updates", role: "CeitoTweaks", color: 0x9b59b6, titulo: "🆕 CeitoTweaks v1.9.1" },
  { channel: "ceitotify-updates", role: "Ceitotify", color: 0x2ecc71, titulo: "🆕 CeitoTweaks v1.9.1 — Arreglar Ceitotify" }
];

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.channels.fetch();
    await guild.roles.fetch();
    for (const d of DESTINOS) {
      const channel = guild.channels.cache.find((c) => c.name === d.channel);
      if (!channel) {
        console.error("Canal no encontrado:", d.channel);
        continue;
      }
      const role = guild.roles.cache.find((r) => r.name === d.role);
      const embed = new EmbedBuilder().setTitle(d.titulo).setColor(d.color).setDescription(CAMBIOS).setTimestamp();
      await channel.send({ content: role ? `${role}` : undefined, embeds: [embed] });
      console.log("Publicado en:", channel.name, role ? "(con ping)" : "(sin rol)");
    }
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
