const { ActivityType, REST, Routes } = require("discord.js");
const { primeAllGuilds } = require("../utils/inviteTracker");
const { runAutoSetup } = require("../utils/autoSetup");
const { startSubscriptionChecker } = require("../utils/subscriptionChecker");
const { startGiveawayChecker } = require("../utils/giveawayChecker");
const { startDbBackups } = require("../utils/dbBackup");
const { startPersonalReminderChecker } = require("../utils/personalReminderChecker");
const { restoreQueuesOnReady } = require("../utils/quickQueue");
const fs = require("fs");
const path = require("path");

async function deployGuildCommands(client) {
  try {
    const commands = [];
    const commandsPath = path.join(__dirname, "../commands");
    for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"))) {
      const cmd = require(path.join(commandsPath, file));
      if (cmd.data) commands.push(cmd.data.toJSON());
    }
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
    console.log(`[deploy] ${commands.length} comandos registrados en el servidor.`);
  } catch (e) {
    console.error("[deploy] Error registrando comandos:", e.message);
  }
}

module.exports = {
  name: "clientReady",
  once: true,
  async execute(client) {
    console.log(`Bot conectado como ${client.user.tag}`);

    client.user.setPresence({
      activities: [{ name: "custom", type: ActivityType.Custom, state: "discord.gg/ceitus" }],
      status: "online"
    });

    await runAutoSetup(client).catch((e) => console.error("[auto-setup] Error:", e.message));
    await primeAllGuilds(client).catch((e) => console.error("[invites] Error inicializando cache:", e.message));
    startSubscriptionChecker(client);
    startGiveawayChecker(client);
    startDbBackups(client);
    startPersonalReminderChecker(client);
    restoreQueuesOnReady(client).catch((e) => console.error("[quickQueue] Error restaurando colas:", e.message));
    deployGuildCommands(client);
  }
};
