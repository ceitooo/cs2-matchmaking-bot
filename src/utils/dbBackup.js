const { AttachmentBuilder } = require("discord.js");
const { getGuildSettings, dbPath } = require("../db/database");

const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // cada 24 horas

async function backupGuild(guild) {
  const settings = getGuildSettings(guild.id);
  if (!settings.backups_channel_id) return;

  const channel = await guild.channels.fetch(settings.backups_channel_id).catch(() => null);
  if (!channel?.isTextBased()) return;

  const attachment = new AttachmentBuilder(dbPath, { name: `matchmaking-${new Date().toISOString().slice(0, 10)}.db` });
  await channel.send({ content: `🗄️ Backup automático de la base de datos.`, files: [attachment] }).catch((e) => console.error("[backup] Error:", e.message));
}

async function runBackups(client) {
  for (const guild of client.guilds.cache.values()) {
    await backupGuild(guild).catch((e) => console.error(`[backup] Error en ${guild.name}:`, e.message));
  }
}

function startDbBackups(client) {
  runBackups(client).catch((e) => console.error("[backup] Error:", e.message));
  setInterval(() => {
    runBackups(client).catch((e) => console.error("[backup] Error:", e.message));
  }, BACKUP_INTERVAL_MS);
}

module.exports = { startDbBackups };
