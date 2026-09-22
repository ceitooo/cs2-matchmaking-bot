require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { buildSalesPanel } = require("../src/sales/robloxPanel");
const { getGuildSettings, updateGuildSettings } = require("../src/db/database");

const GUILD_ID   = process.env.GUILD_ID;
const CHANNEL_ID = "1551930389931630662"; // #buy-ceitus-roblox-external

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", async () => {
  console.log(`[panel] Bot conectado como ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel?.isTextBased()) throw new Error("Canal no encontrado o no es de texto.");

    const settings = getGuildSettings(GUILD_ID);
    let message = null;

    // Si ya hay un panel publicado, lo edita en vez de crear uno nuevo
    if (settings.roblox_panel_channel_id === CHANNEL_ID && settings.roblox_panel_message_id) {
      message = await channel.messages.fetch(settings.roblox_panel_message_id).catch(() => null);
      if (message) {
        await message.edit(await buildSalesPanel());
        console.log(`[panel] Panel actualizado (mensaje ${message.id})`);
      }
    }

    if (!message) {
      message = await channel.send(await buildSalesPanel());
      updateGuildSettings(GUILD_ID, {
        roblox_panel_channel_id: CHANNEL_ID,
        roblox_panel_message_id: message.id
      });
      console.log(`[panel] Panel publicado (mensaje ${message.id}) en #buy-ceitus-roblox-external`);
    }
  } catch (e) {
    console.error("[panel] Error:", e.message);
  }

  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
