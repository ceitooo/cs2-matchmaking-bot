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
`);

for (const migration of [
  "ALTER TABLE players ADD COLUMN steam_id TEXT",
  "ALTER TABLE players ADD COLUMN steam_name TEXT"
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

function getOrCreatePlayer(userId, username) {
  const existing = db.prepare("SELECT * FROM players WHERE user_id = ?").get(userId);
  if (existing) {
    if (existing.username !== username) {
      db.prepare("UPDATE players SET username = ? WHERE user_id = ?").run(username, userId);
    }
    return existing;
  }
  db.prepare("INSERT INTO players (user_id, username) VALUES (?, ?)").run(userId, username);
  return db.prepare("SELECT * FROM players WHERE user_id = ?").get(userId);
}

module.exports = { db, getOrCreatePlayer };
