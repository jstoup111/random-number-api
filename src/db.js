const Database = require('better-sqlite3');

function createDb(path) {
  const db = new Database(path);
  db.exec(`CREATE TABLE IF NOT EXISTS generated_numbers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number INTEGER NOT NULL,
    generated_at TEXT NOT NULL
  )`);
  return db;
}

module.exports = { createDb };
