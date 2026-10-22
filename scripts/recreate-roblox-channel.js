require("dotenv").config();
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require("discord.js");
const { buildSalesPanel } = require("../src/sales/robloxPanel");
const { updateGuildSettings } = require("../src/db/database");

const GUILD_ID    = process.env.GUILD_ID;
const CATEGORY_ID = "1542357676439248976"; // 🛒・Ceitus Sales

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", async () => {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    let channel = guild.channels.cache.find(c => c.name === "buy-ceitus-roblox-external" && c.type === ChannelType.GuildText);
    if (!channel) {
      channel = await guild.channels.create({
        name: "buy-ceitus-roblox-external",
        type: ChannelType.GuildText,
        parent: CATEGORY_ID,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.CreatePublicThreads] },
          { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles] }
        ]
      });
      console.log(`[recreate] Canal creado: ${channel.id}`);
    } else console.log(`[recreate] Canal ya existe: ${channel.id}`);

    const message = await channel.send(await buildSalesPanel());
    updateGuildSettings(GUILD_ID, { roblox_panel_channel_id: channel.id, roblox_panel_message_id: message.id });
    console.log(`[recreate] Panel publicado: ${message.id}`);
    console.log(`NEW_CHANNEL_ID=${channel.id}`);
  } catch (e) { console.error("[recreate] Error:", e); }
  client.destroy(); process.exit(0);
});
client.login(process.env.DISCORD_TOKEN);
