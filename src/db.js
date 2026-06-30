const Database = require('better-sqlite3');

function createDb(path) {
  const db = new Database(path);
  db.exec(`CREATE TABLE IF NOT EXISTS generated_numbers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number INTEGER NOT NULL,
    generated_at TEXT NOT NULL
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS generated_characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character TEXT NOT NULL,
    case_used TEXT NOT NULL,
    generated_at TEXT NOT NULL
  )`);
  return db;
}

/**
 * Creates a fallback DB wrapper that will throw when any method is called.
 * This allows the server to start even if the real database cannot be initialized.
 */
function createFallbackDb() {
  return {
    prepare: () => {
      throw new Error('Database unavailable: failed to initialize at startup');
    }
  };
}

module.exports = { createDb, createFallbackDb };
