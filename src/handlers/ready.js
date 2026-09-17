const { ActivityType } = require("discord.js");
const { primeAllGuilds } = require("../utils/inviteTracker");
const { runAutoSetup } = require("../utils/autoSetup");
const { startSubscriptionChecker } = require("../utils/subscriptionChecker");
const { startGiveawayChecker } = require("../utils/giveawayChecker");
const { startDbBackups } = require("../utils/dbBackup");
const { startPersonalReminderChecker } = require("../utils/personalReminderChecker");
const { restoreQueuesOnReady } = require("../utils/quickQueue");

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
  }
};
