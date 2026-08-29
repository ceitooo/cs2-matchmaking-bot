const path = require("node:path");
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");

const dataDir = path.join(__dirname, "..", "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const database = new DatabaseSync(path.join(dataDir, "matchmaking.db"));
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
  shop_panel_message_id TEXT
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
`);

for (const migration of [
  "ALTER TABLE players ADD COLUMN steam_id TEXT",
  "ALTER TABLE players ADD COLUMN steam_name TEXT",
  "ALTER TABLE players ADD COLUMN avatar_url TEXT",
  "ALTER TABLE lobbies ADD COLUMN team_a_name TEXT NOT NULL DEFAULT 'Equipo A'",
  "ALTER TABLE lobbies ADD COLUMN team_b_name TEXT NOT NULL DEFAULT 'Equipo B'",
  "ALTER TABLE lobbies ADD COLUMN opened_by TEXT",
  "ALTER TABLE players ADD COLUMN lobbies_played INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE players ADD COLUMN lobbies_created INTEGER NOT NULL DEFAULT 0"
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

module.exports = { db, getOrCreatePlayer, getGuildSettings, updateGuildSettings };
