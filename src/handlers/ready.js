const { primeAllGuilds } = require("../utils/inviteTracker");
const { runAutoSetup } = require("../utils/autoSetup");
const { startSubscriptionChecker } = require("../utils/subscriptionChecker");
const { startGiveawayChecker } = require("../utils/giveawayChecker");
const { startDbBackups } = require("../utils/dbBackup");

module.exports = {
  name: "clientReady",
  once: true,
  async execute(client) {
    console.log(`Bot conectado como ${client.user.tag}`);
    await runAutoSetup(client).catch((e) => console.error("[auto-setup] Error:", e.message));
    await primeAllGuilds(client).catch((e) => console.error("[invites] Error inicializando cache:", e.message));
    startSubscriptionChecker(client);
    startGiveawayChecker(client);
    startDbBackups(client);
  }
};
