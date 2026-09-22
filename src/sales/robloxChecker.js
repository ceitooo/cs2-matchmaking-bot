const { EmbedBuilder } = require("discord.js");
const { getGuildSettings, updateGuildSettings } = require("../db/database");
const { buildSalesPanel } = require("./robloxPanel");

const ROBLOX_VERSION_URL = "https://clientsettings.roblox.com/v2/client-version/WindowsPlayer";
const CHECK_INTERVAL_MS = 3 * 60 * 1000; // cada 3 minutos

let _client = null;

function setCheckerClient(client) {
  _client = client;
}

async function fetchRobloxVersion() {
  const res = await fetch(ROBLOX_VERSION_URL, { signal: AbortSignal.timeout(10000) });
  const data = await res.json();
  return data.clientVersionUpload ?? data.version ?? null;
}

async function updatePanel(guild, settings) {
  if (!settings.roblox_panel_channel_id || !settings.roblox_panel_message_id) return;
  try {
    const ch = await guild.channels.fetch(settings.roblox_panel_channel_id);
    const msg = await ch.messages.fetch(settings.roblox_panel_message_id);
    await msg.edit(await buildSalesPanel(settings.roblox_panel_status ?? "activo", settings.roblox_last_version));
  } catch (e) {
    console.error("[roblox-checker] Error actualizando panel:", e.message);
  }
}

async function checkRobloxVersion() {
  if (!_client) return;

  let newVersion;
  try {
    newVersion = await fetchRobloxVersion();
  } catch (e) {
    console.error("[roblox-checker] Error consultando versión:", e.message);
    return;
  }

  for (const [guildId, guild] of _client.guilds.cache) {
    const settings = getGuildSettings(guildId);
    if (!settings.roblox_updates_channel_id) continue;

    const lastVersion = settings.roblox_last_version;
    if (lastVersion === newVersion) continue; // sin cambios

    console.log(`[roblox-checker] Nueva versión detectada: ${newVersion} (anterior: ${lastVersion})`);

    // Guardar nueva versión y poner en mantenimiento
    updateGuildSettings(guildId, {
      roblox_last_version: newVersion,
      roblox_panel_status: "mantenimiento"
    });

    // Actualizar panel
    await updatePanel(guild, { ...settings, roblox_last_version: newVersion, roblox_panel_status: "mantenimiento" });

    // Notificar en canal de actualizaciones
    const updatesCh = await guild.channels.fetch(settings.roblox_updates_channel_id).catch(() => null);
    if (updatesCh?.isTextBased()) {
      const embed = new EmbedBuilder()
        .setTitle("🔴 Roblox se actualizó — Ceitus en Mantenimiento")
        .setColor(0xff8800)
        .setDescription(
          `Roblox lanzó una nueva versión.\n` +
          `**Ceitus Roblox External** está temporalmente en mantenimiento mientras se actualiza.\n\n` +
          `🔄 **Nueva versión:** \`${newVersion}\`\n\n` +
          `El staff será notificado cuando esté listo. Usá \`/onceitusroblox\` para reactivarlo.`
        )
        .setTimestamp();
      await updatesCh.send({ embeds: [embed] }).catch(() => {});
    }
  }
}

function startRobloxChecker() {
  // Primera check al iniciar
  setTimeout(checkRobloxVersion, 10000);
  // Luego cada 3 minutos
  setInterval(checkRobloxVersion, CHECK_INTERVAL_MS);
  console.log("[roblox-checker] Monitor de versiones iniciado (cada 3 min).");
}

module.exports = { startRobloxChecker, setCheckerClient, fetchRobloxVersion, updatePanel };
