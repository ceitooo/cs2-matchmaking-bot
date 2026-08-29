require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { getOrCreateTicketsCategory, getOrCreateLogsChannel } = require("../src/utils/tickets");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const category = await getOrCreateTicketsCategory(guild);
    const logs = await getOrCreateLogsChannel(guild);
    console.log(`Categoría lista: ${category.name} (${category.id})`);
    console.log(`Canal de logs listo: ${logs.name} (${logs.id})`);
  } catch (error) {
    console.error(error);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
