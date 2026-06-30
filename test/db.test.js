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
});
