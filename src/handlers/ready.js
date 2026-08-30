const { primeAllGuilds } = require("../utils/inviteTracker");

module.exports = {
  name: "clientReady",
  once: true,
  async execute(client) {
    console.log(`Bot conectado como ${client.user.tag}`);
    await primeAllGuilds(client).catch((e) => console.error("[invites] Error inicializando cache:", e.message));
  }
};
