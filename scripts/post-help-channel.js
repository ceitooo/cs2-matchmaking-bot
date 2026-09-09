require("dotenv").config();
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const PUBLIC_CATEGORIES = [
  {
    name: "🎮 Matchmaking",
    commands: [
      "`/stats` — tus estadísticas de ELO",
      "`/steam-stats` — tus stats de CS2",
      "`/vincular-steam` — vinculá tu cuenta de Steam",
      "`/perfil` — tu perfil de comunidad"
    ]
  },
  { name: "🏆 Niveles", commands: ["`/rank` — tu tarjeta de nivel y XP"] },
  {
    name: "😴 Utilidad",
    commands: ["`/afk` — marcate como AFK con un motivo", "`/recordarme` — recordatorio personal por DM", "`/traducir` — traducí cualquier texto"]
  },
  {
    name: "🎨 Imágenes divertidas",
    commands: [
      "`/magik`, `/deepfry`, `/jail` — distorsiona un avatar",
      "`/trigger`, `/triggered`, `/spin`, `/rainbow` — gifs animados",
      "`/wanted`, `/wasted`, `/rip` — carteles con el avatar",
      "`/petpet` — GIF acariciando el avatar",
      "`/shipeo` — compatibilidad entre dos personas",
      "`/slap`, `/kiss`, `/hug`, `/pat` — reacciones con gif",
      "`/aura`, `/cat` — gifs random"
    ]
  },
  { name: "🎲 Diversión", commands: ["`/8ball` — preguntale a la bola 8", "`/dado`, `/moneda` — random rápido"] }
];

function buildEmbed() {
  const embed = new EmbedBuilder().setTitle("📖 Comandos disponibles").setColor(0x5865f2).setDescription("Comandos que cualquiera puede usar:");
  for (const category of PUBLIC_CATEGORIES) embed.addFields({ name: category.name, value: category.commands.join("\n") });
  return embed;
}

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.channels.fetch();

    let channel = guild.channels.cache.find((c) => c.type === ChannelType.GuildText && c.name === "📖┃comandos");
    if (!channel) {
      channel = await guild.channels.create({
        name: "📖┃comandos",
        type: ChannelType.GuildText,
        position: guild.channels.cache.size,
        permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.SendMessages] }]
      });
      console.log("Canal creado:", channel.id);
    }

    const messages = await channel.messages.fetch({ limit: 10 });
    const existing = messages.find((m) => m.author.id === client.user.id && m.embeds.length > 0);

    const embed = buildEmbed();
    if (existing) {
      await existing.edit({ embeds: [embed] });
      console.log("Mensaje actualizado.");
    } else {
      await channel.send({ embeds: [embed] });
      console.log("Mensaje publicado.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
