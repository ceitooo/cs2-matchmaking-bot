const { ActivityType, REST, Routes } = require("discord.js");
const { primeAllGuilds } = require("../utils/inviteTracker");
const { runAutoSetup } = require("../utils/autoSetup");
const { startSubscriptionChecker } = require("../utils/subscriptionChecker");
const { startGiveawayChecker } = require("../utils/giveawayChecker");
const { startDbBackups } = require("../utils/dbBackup");
const { startPersonalReminderChecker } = require("../utils/personalReminderChecker");
const { restoreQueuesOnReady } = require("../utils/quickQueue");
const { startLockoutChecker } = require("../utils/lockout");
const fs = require("fs");
const path = require("path");

// Comandos ligados al negocio/economía de Ceitus (stock, keys, tienda,
// sorteos, niveles, bienvenida/boost...): solo deben existir en el server
// de Ceitus, no tiene sentido que aparezcan en otros servers del bot.
const CEITUS_ONLY_COMMANDS = new Set([
  "generarkeyceitusroblox",
  "regenerarstock",
  "eliminarkey",
  "vaciarstock",
  "stock",
  "tienda",
  "misinvitaciones",
  "probarboost",
  "probarkey",
  "panel",
  "vincular-steam"
]);

async function deployCommands(client) {
  try {
    const globalCommands = [];
    const ceitusCommands = [];
    const commandsPath = path.join(__dirname, "../commands");
    for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"))) {
      const cmd = require(path.join(commandsPath, file));
      if (!cmd.data) continue;
      const json = cmd.data.toJSON();
      if (CEITUS_ONLY_COMMANDS.has(json.name)) {
        ceitusCommands.push(json);
      } else {
        globalCommands.push(json);
      }
    }

    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: globalCommands });
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: ceitusCommands });

    console.log(`[deploy] ${globalCommands.length} comandos globales, ${ceitusCommands.length} solo en Ceitus.`);
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
      activities: [{ name: "custom", type: ActivityType.Custom, state: "☁️ /help・discord.gg/ceitus" }],
      status: "online"
    });

    await runAutoSetup(client).catch((e) => console.error("[auto-setup] Error:", e.message));
    await primeAllGuilds(client).catch((e) => console.error("[invites] Error inicializando cache:", e.message));
    startSubscriptionChecker(client);
    startGiveawayChecker(client);
    startDbBackups(client);
    startPersonalReminderChecker(client);
    restoreQueuesOnReady(client).catch((e) => console.error("[quickQueue] Error restaurando colas:", e.message));
    startLockoutChecker(client);
    deployCommands(client);
  }
};
