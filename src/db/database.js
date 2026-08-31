const path = require("node:path");
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");

const dataDir = path.join(__dirname, "..", "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "matchmaking.db");
const database = new DatabaseSync(dbPath);
database.exec("PRAGMA journal_mode = WAL;");

database.exec(`
CREATE TABLE IF NOT EXISTS players (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  elo INTEGER NOT NULL DEFAULT 1000,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  in_queue INTEGER NOT NULL DEFAULT 0,
  in_match INTEGER NOT NULL DEFAULT 0,
  steam_id TEXT
);

CREATE TABLE IF NOT EXISTS queue (
  user_id TEXT PRIMARY KEY,
  joined_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES players(user_id)
);

CREATE TABLE IF NOT EXISTS lobbies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT,
  creator_id TEXT,
  match_code TEXT,
  category_id TEXT,
  team_a_channel TEXT,
  team_b_channel TEXT,
  team_a_name TEXT NOT NULL DEFAULT 'Equipo A',
  team_b_name TEXT NOT NULL DEFAULT 'Equipo B',
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS lobby_players (
  lobby_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  team TEXT NOT NULL CHECK (team IN ('A', 'B')),
  ready INTEGER NOT NULL DEFAULT 0,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (lobby_id, user_id)
);

CREATE TABLE IF NOT EXISTS quick_queues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT,
  mode TEXT NOT NULL,
  size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  voice_channel_id TEXT,
  first_joined_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS quick_queue_players (
  queue_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (queue_id, user_id)
);

CREATE TABLE IF NOT EXISTS quick_voice_channels (
  channel_id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  team_a TEXT NOT NULL,
  team_b TEXT NOT NULL,
  team_a_channel TEXT,
  team_b_channel TEXT,
  text_channel TEXT,
  created_at INTEGER NOT NULL,
  winner TEXT
);

CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id TEXT PRIMARY KEY,
  welcome_channel_id TEXT,
  welcome_image_url TEXT,
  boost_channel_id TEXT,
  boost_image_url TEXT,
  shop_ticket_category_id TEXT,
  shop_staff_role_id TEXT,
  shop_panel_channel_id TEXT,
  shop_panel_message_id TEXT,
  antiraid_enabled INTEGER NOT NULL DEFAULT 1,
  antiraid_log_channel_id TEXT,
  logs_category_id TEXT,
  log_bans_channel_id TEXT,
  log_nicknames_channel_id TEXT,
  log_messages_channel_id TEXT,
  log_server_channel_id TEXT,
  log_verifications_channel_id TEXT,
  log_warns_channel_id TEXT,
  invites_category_id TEXT,
  invites_channel_id TEXT,
  match_alerts_channel_id TEXT,
  automod_enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS shop_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS warns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  moderator_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS invites (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  uses INTEGER NOT NULL DEFAULT 0,
  reward_progress INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS afk_status (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'AFK',
  set_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  product TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  notified_3d INTEGER NOT NULL DEFAULT 0,
  notified_0d INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS giveaways (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  prize TEXT NOT NULL,
  winners_count INTEGER NOT NULL DEFAULT 1,
  ends_at INTEGER NOT NULL,
  ended INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  respuesta TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS personal_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  remind_at INTEGER NOT NULL,
  sent INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS automod_offenses (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS blacklist_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  word TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reward_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  resource TEXT NOT NULL,
  key_value TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  redeemed_by TEXT,
  redeemed_at INTEGER,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`);

for (const migration of [
  "ALTER TABLE players ADD COLUMN steam_id TEXT",
  "ALTER TABLE players ADD COLUMN steam_name TEXT",
  "ALTER TABLE players ADD COLUMN avatar_url TEXT",
  "ALTER TABLE lobbies ADD COLUMN team_a_name TEXT NOT NULL DEFAULT 'Equipo A'",
  "ALTER TABLE lobbies ADD COLUMN team_b_name TEXT NOT NULL DEFAULT 'Equipo B'",
  "ALTER TABLE lobbies ADD COLUMN opened_by TEXT",
  "ALTER TABLE players ADD COLUMN lobbies_played INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE players ADD COLUMN lobbies_created INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE guild_settings ADD COLUMN shop_ticket_category_id TEXT",
  "ALTER TABLE guild_settings ADD COLUMN shop_staff_role_id TEXT",
  "ALTER TABLE guild_settings ADD COLUMN shop_panel_channel_id TEXT",
  "ALTER TABLE guild_settings ADD COLUMN shop_panel_message_id TEXT",
  "ALTER TABLE guild_settings ADD COLUMN welcome_color TEXT",
  "ALTER TABLE guild_settings ADD COLUMN boost_color TEXT",
  "ALTER TABLE guild_settings ADD COLUMN antiraid_enabled INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE guild_settings ADD COLUMN antiraid_log_channel_id TEXT",
  "ALTER TABLE guild_settings DROP COLUMN wallpaper_pc_channel_id",
  "ALTER TABLE guild_settings DROP COLUMN wallpaper_mobile_channel_id",
  "ALTER TABLE guild_settings DROP COLUMN wallpaper_category",
  "ALTER TABLE guild_settings DROP COLUMN wallpaper_last_posted_at",
  "ALTER TABLE guild_settings DROP COLUMN banner_channel_id",
  "ALTER TABLE guild_settings DROP COLUMN icon_channel_id",
  "ALTER TABLE guild_settings ADD COLUMN logs_category_id TEXT",
  "ALTER TABLE guild_settings ADD COLUMN log_bans_channel_id TEXT",
  "ALTER TABLE guild_settings ADD COLUMN log_nicknames_channel_id TEXT",
  "ALTER TABLE guild_settings ADD COLUMN log_messages_channel_id TEXT",
  "ALTER TABLE guild_settings ADD COLUMN log_server_channel_id TEXT",
  "ALTER TABLE guild_settings ADD COLUMN log_verifications_channel_id TEXT",
  "ALTER TABLE guild_settings ADD COLUMN log_warns_channel_id TEXT",
  "ALTER TABLE guild_settings ADD COLUMN invites_category_id TEXT",
  "ALTER TABLE guild_settings ADD COLUMN invites_channel_id TEXT",
  "ALTER TABLE guild_settings ADD COLUMN match_alerts_channel_id TEXT",
  "ALTER TABLE guild_settings ADD COLUMN automod_enabled INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE lobbies ADD COLUMN match_started_notified INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE invites ADD COLUMN reward_progress INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE guild_settings ADD COLUMN stock_keys_channel_id TEXT",
  "ALTER TABLE guild_settings ADD COLUMN stock_keys_category_id TEXT",
  "ALTER TABLE guild_settings ADD COLUMN invites_sticky_message_id TEXT",
  "ALTER TABLE guild_settings ADD COLUMN recordatorios_channel_id TEXT",
  "ALTER TABLE guild_settings ADD COLUMN recordatorios_category_id TEXT",
  "ALTER TABLE guild_settings ADD COLUMN backups_channel_id TEXT",
  "ALTER TABLE guild_settings ADD COLUMN self_roles_json TEXT",
  "ALTER TABLE guild_settings ADD COLUMN backups_category_id TEXT"
]) {
  try {
    database.exec(migration);
  } catch {
    // ya existe la columna
  }
}

// Envoltorio con la misma interfaz que usaba better-sqlite3 (db.prepare(...).get/all/run, db.exec)
const db = {
  prepare(sql) {
    const stmt = database.prepare(sql);
    return {
      get: (...args) => stmt.get(...args),
      all: (...args) => stmt.all(...args),
      run: (...args) => stmt.run(...args)
    };
  },
  exec(sql) {
    return database.exec(sql);
  }
};

function getOrCreatePlayer(userId, username, avatarUrl) {
  const existing = db.prepare("SELECT * FROM players WHERE user_id = ?").get(userId);
  if (existing) {
    if (existing.username !== username || (avatarUrl && existing.avatar_url !== avatarUrl)) {
      db.prepare("UPDATE players SET username = ?, avatar_url = COALESCE(?, avatar_url) WHERE user_id = ?").run(username, avatarUrl ?? null, userId);
    }
    return db.prepare("SELECT * FROM players WHERE user_id = ?").get(userId);
  }
  db.prepare("INSERT INTO players (user_id, username, avatar_url) VALUES (?, ?, ?)").run(userId, username, avatarUrl ?? null);
  return db.prepare("SELECT * FROM players WHERE user_id = ?").get(userId);
}

function getGuildSettings(guildId) {
  const existing = db.prepare("SELECT * FROM guild_settings WHERE guild_id = ?").get(guildId);
  if (existing) return existing;
  db.prepare("INSERT INTO guild_settings (guild_id) VALUES (?)").run(guildId);
  return db.prepare("SELECT * FROM guild_settings WHERE guild_id = ?").get(guildId);
}

function updateGuildSettings(guildId, fields) {
  getGuildSettings(guildId);
  const columns = Object.keys(fields);
  if (columns.length === 0) return getGuildSettings(guildId);
  const setClause = columns.map((c) => `${c} = ?`).join(", ");
  db.prepare(`UPDATE guild_settings SET ${setClause} WHERE guild_id = ?`).run(...columns.map((c) => fields[c]), guildId);
  return getGuildSettings(guildId);
}

function addWarn(guildId, userId, moderatorId, reason) {
  db.prepare("INSERT INTO warns (guild_id, user_id, moderator_id, reason, created_at) VALUES (?, ?, ?, ?, ?)").run(
    guildId,
    userId,
    moderatorId,
    reason,
    Date.now()
  );
  return db.prepare("SELECT * FROM warns WHERE guild_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1").get(guildId, userId);
}

function getWarns(guildId, userId) {
  return db.prepare("SELECT * FROM warns WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC").all(guildId, userId);
}

function removeWarn(guildId, warnId) {
  return db.prepare("DELETE FROM warns WHERE guild_id = ? AND id = ?").run(guildId, warnId);
}

function addInviteUse(guildId, userId, amount = 1) {
  db.prepare("INSERT INTO invites (guild_id, user_id, uses) VALUES (?, ?, ?) ON CONFLICT(guild_id, user_id) DO UPDATE SET uses = uses + ?").run(
    guildId,
    userId,
    amount,
    amount
  );
  return db.prepare("SELECT * FROM invites WHERE guild_id = ? AND user_id = ?").get(guildId, userId);
}

function getInviteCount(guildId, userId) {
  const row = db.prepare("SELECT * FROM invites WHERE guild_id = ? AND user_id = ?").get(guildId, userId);
  return row?.uses ?? 0;
}

const INVITES_PER_REWARD = 5;

// Devuelve cuántos premios nuevos desbloqueó (normalmente 0 o 1, pero soporta saltos)
function claimPendingRewards(guildId, userId) {
  const row = db.prepare("SELECT * FROM invites WHERE guild_id = ? AND user_id = ?").get(guildId, userId);
  if (!row) return 0;

  const earned = Math.floor(row.uses / INVITES_PER_REWARD);
  const pending = earned - row.reward_progress;
  if (pending <= 0) return 0;

  db.prepare("UPDATE invites SET reward_progress = ? WHERE guild_id = ? AND user_id = ?").run(earned, guildId, userId);
  return pending;
}

function keyExists(guildId, keyValue) {
  return !!db.prepare("SELECT 1 FROM reward_keys WHERE guild_id = ? AND key_value = ?").get(guildId, keyValue);
}

function addKey(guildId, resource, keyValue, createdBy) {
  db.prepare("INSERT INTO reward_keys (guild_id, resource, key_value, created_by, created_at) VALUES (?, ?, ?, ?, ?)").run(
    guildId,
    resource,
    keyValue,
    createdBy,
    Date.now()
  );
}

function getAvailableResources(guildId) {
  return db
    .prepare("SELECT resource, COUNT(*) as stock FROM reward_keys WHERE guild_id = ? AND used = 0 GROUP BY resource HAVING stock > 0")
    .all(guildId);
}

function clearStock(guildId, resource) {
  if (resource) {
    return db.prepare("DELETE FROM reward_keys WHERE guild_id = ? AND resource = ? AND used = 0").run(guildId, resource).changes;
  }
  return db.prepare("DELETE FROM reward_keys WHERE guild_id = ? AND used = 0").run(guildId).changes;
}

function deleteKey(guildId, keyValue) {
  return db.prepare("DELETE FROM reward_keys WHERE guild_id = ? AND key_value = ? AND used = 0").run(guildId, keyValue).changes;
}

function setAfk(guildId, userId, reason) {
  db.prepare(
    "INSERT INTO afk_status (guild_id, user_id, reason, set_at) VALUES (?, ?, ?, ?) ON CONFLICT(guild_id, user_id) DO UPDATE SET reason = ?, set_at = ?"
  ).run(guildId, userId, reason, Date.now(), reason, Date.now());
}

function getAfk(guildId, userId) {
  return db.prepare("SELECT * FROM afk_status WHERE guild_id = ? AND user_id = ?").get(guildId, userId);
}

function clearAfk(guildId, userId) {
  return db.prepare("DELETE FROM afk_status WHERE guild_id = ? AND user_id = ?").run(guildId, userId).changes;
}

function addSubscription(guildId, userId, product, expiresAt, createdBy) {
  db.prepare("INSERT INTO subscriptions (guild_id, user_id, product, expires_at, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    guildId,
    userId,
    product,
    expiresAt,
    createdBy,
    Date.now()
  );
  return db.prepare("SELECT * FROM subscriptions WHERE guild_id = ? ORDER BY id DESC LIMIT 1").get(guildId);
}

function listSubscriptions(guildId) {
  return db.prepare("SELECT * FROM subscriptions WHERE guild_id = ? ORDER BY expires_at ASC").all(guildId);
}

function deleteSubscription(guildId, id) {
  return db.prepare("DELETE FROM subscriptions WHERE guild_id = ? AND id = ?").run(guildId, id).changes;
}

function getSubscriptionsToNotify() {
  const now = Date.now();
  const in3Days = now + 3 * 24 * 60 * 60 * 1000;
  return db
    .prepare(
      `SELECT * FROM subscriptions
       WHERE (expires_at <= ? AND notified_3d = 0)
          OR (expires_at <= ? AND notified_0d = 0)`
    )
    .all(in3Days, now);
}

function markSubscriptionNotified(id, field) {
  db.prepare(`UPDATE subscriptions SET ${field} = 1 WHERE id = ?`).run(id);
}

function countActiveSubscriptions(guildId) {
  return db.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE guild_id = ? AND expires_at > ?").get(guildId, Date.now()).count;
}

function addGiveaway(guildId, channelId, messageId, prize, winnersCount, endsAt, createdBy) {
  db.prepare(
    "INSERT INTO giveaways (guild_id, channel_id, message_id, prize, winners_count, ends_at, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(guildId, channelId, messageId, prize, winnersCount, endsAt, createdBy, Date.now());
  return db.prepare("SELECT * FROM giveaways WHERE guild_id = ? ORDER BY id DESC LIMIT 1").get(guildId);
}

function getActiveGiveawaysDue() {
  return db.prepare("SELECT * FROM giveaways WHERE ended = 0 AND ends_at <= ?").all(Date.now());
}

function getGiveaway(guildId, id) {
  return db.prepare("SELECT * FROM giveaways WHERE guild_id = ? AND id = ?").get(guildId, id);
}

function endGiveawayDb(id) {
  db.prepare("UPDATE giveaways SET ended = 1 WHERE id = ?").run(id);
}

function addFaq(guildId, keyword, respuesta, createdBy) {
  db.prepare("INSERT INTO faqs (guild_id, keyword, respuesta, created_by, created_at) VALUES (?, ?, ?, ?, ?)").run(
    guildId,
    keyword.toLowerCase(),
    respuesta,
    createdBy,
    Date.now()
  );
  return db.prepare("SELECT * FROM faqs WHERE guild_id = ? ORDER BY id DESC LIMIT 1").get(guildId);
}

function listFaqs(guildId) {
  return db.prepare("SELECT * FROM faqs WHERE guild_id = ? ORDER BY id ASC").all(guildId);
}

function deleteFaq(guildId, id) {
  return db.prepare("DELETE FROM faqs WHERE guild_id = ? AND id = ?").run(guildId, id).changes;
}

function addPersonalReminder(guildId, userId, message, remindAt) {
  db.prepare("INSERT INTO personal_reminders (guild_id, user_id, message, remind_at, created_at) VALUES (?, ?, ?, ?, ?)").run(
    guildId,
    userId,
    message,
    remindAt,
    Date.now()
  );
  return db.prepare("SELECT * FROM personal_reminders WHERE guild_id = ? ORDER BY id DESC LIMIT 1").get(guildId);
}

function getDuePersonalReminders() {
  return db.prepare("SELECT * FROM personal_reminders WHERE sent = 0 AND remind_at <= ?").all(Date.now());
}

function markPersonalReminderSent(id) {
  db.prepare("UPDATE personal_reminders SET sent = 1 WHERE id = ?").run(id);
}

function incrementAutomodOffense(guildId, userId) {
  db.prepare(
    "INSERT INTO automod_offenses (guild_id, user_id, count, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(guild_id, user_id) DO UPDATE SET count = count + 1, updated_at = ?"
  ).run(guildId, userId, Date.now(), Date.now());
  return db.prepare("SELECT count FROM automod_offenses WHERE guild_id = ? AND user_id = ?").get(guildId, userId).count;
}

function addBlacklistWord(guildId, word, createdBy) {
  db.prepare("INSERT INTO blacklist_words (guild_id, word, created_by, created_at) VALUES (?, ?, ?, ?)").run(guildId, word.toLowerCase(), createdBy, Date.now());
  return db.prepare("SELECT * FROM blacklist_words WHERE guild_id = ? ORDER BY id DESC LIMIT 1").get(guildId);
}

function listBlacklistWords(guildId) {
  return db.prepare("SELECT * FROM blacklist_words WHERE guild_id = ? ORDER BY id ASC").all(guildId);
}

function deleteBlacklistWord(guildId, id) {
  return db.prepare("DELETE FROM blacklist_words WHERE guild_id = ? AND id = ?").run(guildId, id).changes;
}

function claimKey(guildId, resource, userId) {
  const key = db.prepare("SELECT * FROM reward_keys WHERE guild_id = ? AND resource = ? AND used = 0 ORDER BY id ASC LIMIT 1").get(guildId, resource);
  if (!key) return null;

  const result = db
    .prepare("UPDATE reward_keys SET used = 1, redeemed_by = ?, redeemed_at = ? WHERE id = ? AND used = 0")
    .run(userId, Date.now(), key.id);
  if (result.changes === 0) return null; // otro proceso se la llevó primero

  return key;
}

module.exports = {
  db,
  dbPath,
  countActiveSubscriptions,
  addGiveaway,
  getActiveGiveawaysDue,
  getGiveaway,
  endGiveawayDb,
  getOrCreatePlayer,
  getGuildSettings,
  updateGuildSettings,
  addWarn,
  getWarns,
  removeWarn,
  addInviteUse,
  getInviteCount,
  claimPendingRewards,
  addKey,
  keyExists,
  getAvailableResources,
  claimKey,
  clearStock,
  deleteKey,
  setAfk,
  getAfk,
  clearAfk,
  addFaq,
  listFaqs,
  deleteFaq,
  incrementAutomodOffense,
  addBlacklistWord,
  listBlacklistWords,
  deleteBlacklistWord,
  addPersonalReminder,
  getDuePersonalReminders,
  markPersonalReminderSent,
  addSubscription,
  listSubscriptions,
  deleteSubscription,
  getSubscriptionsToNotify,
  markSubscriptionNotified,
  INVITES_PER_REWARD
};
