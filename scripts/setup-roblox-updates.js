require("dotenv").config();
const { Client, GatewayIntentBits, ChannelType } = require("discord.js");
const { updateGuildSettings } = require("../src/db/database");

const GUILD_ID        = process.env.GUILD_ID;
const SALES_CATEGORY  = "1542357676439248976"; // 🛒・Ceitus Sales
const PANEL_CHANNEL   = "1551930389931630662"; // #buy-ceitus-roblox-external

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", async () => {
  console.log(`[setup] Conectado como ${client.user.tag}`);
  const guild = await client.guilds.fetch(GUILD_ID);

  // Buscar o crear canal roblox-updates
  let updatesCh = guild.channels.cache.find((c) => c.name === "roblox-updates");
  if (!updatesCh) {
    updatesCh = await guild.channels.create({
      name: "roblox-updates",
      type: ChannelType.GuildText,
      parent: SALES_CATEGORY,
      topic: "Actualizaciones automáticas de Roblox y estado de Ceitus Roblox External."
    });
    console.log(`[setup] Canal creado: #roblox-updates (${updatesCh.id})`);
  } else {
    console.log(`[setup] Canal existente: #roblox-updates (${updatesCh.id})`);
  }

  // Buscar canal de anuncios
  const announceCh = guild.channels.cache.find(
    (c) => c.name === "anuncios" || c.name === "announcements" || c.name === "ceitus-anuncios"
  );
  if (announceCh) console.log(`[setup] Canal de anuncios: #${announceCh.name} (${announceCh.id})`);

  // Guardar en DB
  updateGuildSettings(GUILD_ID, {
    roblox_updates_channel_id:  updatesCh.id,
    roblox_panel_channel_id:    PANEL_CHANNEL,
    roblox_panel_status:        "activo",
    ...(announceCh ? { roblox_announce_channel_id: announceCh.id } : {})
  });

  console.log("[setup] Configuración guardada en DB.");
  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
