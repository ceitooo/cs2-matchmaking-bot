require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const fs   = require("fs");
const path = require("path");
const https = require("https");

const VERSION_FILE = path.join(__dirname, ".roblox_version_cache.txt");
const CHANNEL_NAME = "ceitus-actualizaciones-roblox"; // cambia al nombre real de tu canal
const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos

function fetchRobloxVersion() {
  return new Promise((resolve, reject) => {
    https.get("https://offsets.imtheo.lol/offsets.json", res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(json["Roblox Version"] || null);
        } catch { reject(new Error("JSON parse error")); }
      });
    }).on("error", reject);
  });
}

function loadCached() {
  try { return fs.readFileSync(VERSION_FILE, "utf8").trim(); } catch { return null; }
}

function saveCached(v) {
  fs.writeFileSync(VERSION_FILE, v, "utf8");
}

async function checkAndNotify(channel) {
  let latest;
  try { latest = await fetchRobloxVersion(); } catch (e) {
    console.error("[monitor] Error fetching version:", e.message); return;
  }
  if (!latest) return;

  const cached = loadCached();
  if (cached === latest) { console.log(`[monitor] Sin cambios: ${latest}`); return; }

  saveCached(latest);
  if (!cached) { console.log(`[monitor] Primera ejecucion, version guardada: ${latest}`); return; }

  console.log(`[monitor] Nueva version detectada: ${latest} (anterior: ${cached})`);
  await channel.send(
    `⚠️ **Nueva actualización de Roblox detectada**\n` +
    `Versión anterior: \`${cached}\`\n` +
    `Versión nueva: \`${latest}\`\n\n` +
    `Los offsets pueden haber cambiado. Revisar y actualizar el cheat.`
  );
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once("ready", async () => {
  console.log(`[monitor] Bot listo como ${client.user.tag}`);

  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  await guild.channels.fetch();

  // Intentar varios nombres de canal
  let channel = guild.channels.cache.find(c =>
    c.name === CHANNEL_NAME ||
    c.name === "ceitus-roblox-descargar" ||
    c.name === "ceitus-updates" ||
    c.name === "actualizaciones"
  );

  if (!channel) {
    console.error("[monitor] Canal no encontrado. Canales disponibles:",
      [...guild.channels.cache.values()].filter(c => c.type === 0).map(c => c.name).join(", "));
    process.exit(1);
  }

  console.log(`[monitor] Usando canal: ${channel.name}`);
  await checkAndNotify(channel);
  setInterval(() => checkAndNotify(channel), CHECK_INTERVAL_MS);
});

client.login(process.env.DISCORD_TOKEN);
