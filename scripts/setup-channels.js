require("dotenv").config();
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const channels = await guild.channels.fetch();

    const maxCategoryPosition = Math.max(
      0,
      ...channels.filter((c) => c.type === ChannelType.GuildCategory).map((c) => c.rawPosition ?? c.position ?? 0)
    );

    const category = await guild.channels.create({
      name: "🔫 ⋆ EMPAREJAMIENTOS CS2 ⋆",
      type: ChannelType.GuildCategory,
      position: maxCategoryPosition + 1
    });

    const panelChannel = await guild.channels.create({
      name: "📋・panel-partidas",
      type: ChannelType.GuildText,
      parent: category.id,
      topic: "Únete a la cola de matchmaking aquí. Usa /panel para refrescar."
    });

    const rulesChannel = await guild.channels.create({
      name: "📜・reglas-y-elo",
      type: ChannelType.GuildText,
      parent: category.id,
      topic: "Cómo funciona el sistema de ELO y las reglas de las partidas.",
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.SendMessages] }
      ]
    });

    const leaderboardChannel = await guild.channels.create({
      name: "🏆・clasificacion",
      type: ChannelType.GuildText,
      parent: category.id,
      topic: "Top jugadores por ELO.",
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.SendMessages] }
      ]
    });

    const lobbyVoice = await guild.channels.create({
      name: "🎙️・sala-de-espera",
      type: ChannelType.GuildVoice,
      parent: category.id
    });

    console.log("Categoría y canales creados:");
    console.log(`- Categoría: ${category.name} (${category.id})`);
    console.log(`- ${panelChannel.name} (${panelChannel.id})`);
    console.log(`- ${rulesChannel.name} (${rulesChannel.id})`);
    console.log(`- ${leaderboardChannel.name} (${leaderboardChannel.id})`);
    console.log(`- ${lobbyVoice.name} (${lobbyVoice.id})`);

    await rulesChannel.send({
      content:
        "**Cómo funciona el matchmaking**\n\n" +
        "1. Vincula tu cuenta de Steam con `/vincular-steam` (obligatorio, evita cuentas falsas).\n" +
        "2. Únete a la cola desde el panel de arriba.\n" +
        "3. Al llegar a 10 jugadores se arman 2 equipos balanceados por ELO y se crean canales de voz privados.\n" +
        "4. Un admin confirma el resultado con `/resultado` al terminar la partida.\n\n" +
        "Todos empiezan con **1000 ELO**. Gana ELO al ganar, pierde al perder — la cantidad depende de qué tan parejo estaba el partido."
    });
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
