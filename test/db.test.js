const fs = require('fs');
const path = require('path');
const os = require('os');
const { createDb } = require('../src/db');

describe('Database module', () => {
  it('createDb returns an object with :memory: path', () => {
    const db = createDb(':memory:');
    expect(db).toBeDefined();
  });

  it('createDb creates the generated_numbers table', () => {
    const db = createDb(':memory:');
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='generated_numbers'"
    ).all();
    expect(result).toHaveLength(1);
  });

  it('createDb auto-creates DB file when the file does not exist', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'db-test-'));
    const dbPath = path.join(tmpDir, 'test-db.db');

    // Verify file does NOT exist before
    expect(fs.existsSync(dbPath)).toBe(false);

    const db = createDb(dbPath);

    // Verify file now EXISTS
    expect(fs.existsSync(dbPath)).toBe(true);

    // Verify table exists
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='generated_numbers'"
    ).all();
    expect(result).toHaveLength(1);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('createDb creates the generated_characters table with required columns', () => {
    const db = createDb(':memory:');
    const tableResult = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='generated_characters'"
    ).all();
    expect(tableResult).toHaveLength(1);

    const columns = db.prepare('PRAGMA table_info(generated_characters)').all();
    const columnNames = columns.map((c) => c.name);
    expect(columnNames).toEqual(expect.arrayContaining(['character', 'case_used', 'generated_at']));
  });
});
