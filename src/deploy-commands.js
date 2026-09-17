require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { REST, Routes } = require("discord.js");

// Debe coincidir con la lista en src/handlers/ready.js
const CEITUS_ONLY_COMMANDS = new Set([
  "generarkeyceitusroblox",
  "regenerarstock",
  "eliminarkey",
  "vaciarstock",
  "stock",
  "stickymensaje",
  "tienda",
  "sorteo",
  "nivelrol",
  "referencia",
  "misinvitaciones",
  "bienvenida",
  "boost",
  "probarboost",
  "probarkey",
  "panel",
  "vincular-steam"
]);

const globalCommands = [];
const ceitusCommands = [];
const commandsPath = path.join(__dirname, "commands");
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"))) {
  const command = require(path.join(commandsPath, file));
  const json = command.data.toJSON();
  if (CEITUS_ONLY_COMMANDS.has(json.name)) {
    ceitusCommands.push(json);
  } else {
    globalCommands.push(json);
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Registrando ${globalCommands.length} comandos globales y ${ceitusCommands.length} solo en Ceitus...`);

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: globalCommands });
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: ceitusCommands });

    console.log("Comandos registrados correctamente.");
  } catch (error) {
    console.error(error);
  }
})();
