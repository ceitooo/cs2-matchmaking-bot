require("dotenv").config();
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require("discord.js");
const { CEITO_ROLE_ID, DEVELOPER_ROLE_ID } = require("../src/utils/permissions");
const { updateGuildSettings } = require("../src/db/database");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const channels = await guild.channels.fetch();

    const maxPosition = Math.max(0, ...channels.filter((c) => c.type === ChannelType.GuildCategory).map((c) => c.rawPosition ?? c.position ?? 0));

    const permissionOverwrites = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: CEITO_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      { id: DEVELOPER_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
    ];

    const category = await guild.channels.create({
      name: "📦┃Regenerar Stock Invitaciones",
      type: ChannelType.GuildCategory,
      position: maxPosition + 1,
      permissionOverwrites
    });

    const channel = await guild.channels.create({
      name: "🔑┃regenerar-stock-invitaciones",
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites
    });

    updateGuildSettings(guild.id, {
      stock_keys_category_id: category.id,
      stock_keys_channel_id: channel.id
    });

    console.log("Categoría y canal creados:");
    console.log(`- Categoría: ${category.name} (${category.id})`);
    console.log(`- Canal: ${channel.name} (${channel.id})`);
    console.log("Guardado en la base de datos del bot. Ya podés pegar keys ahí.");
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
