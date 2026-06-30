const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const { createApp } = require('../../src/app');
const { createDb } = require('../../src/db');

describe('Story: Retrieve History of Generated Numbers', () => {
  let db;
  let app;

  beforeEach(() => {
    db = createDb(':memory:');
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
  });

  it('returns generated numbers most-recent-first, matching what GET /random returned', async () => {
    const generated = [];
    for (let i = 0; i < 3; i++) {
      const res = await request(app).get('/random');
      generated.push(res.body.data.number);
    }

    const historyRes = await request(app).get('/random/history');

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.numbers).toHaveLength(3);

    const expectedDescending = [...generated].reverse();
    historyRes.body.data.numbers.forEach((entry, index) => {
      expect(entry.number).toBe(expectedDescending[index]);
      expect(typeof entry.generatedAt).toBe('string');
      expect(Number.isInteger(entry.number)).toBe(true);
    });
  });
});

describe('Story: History Persists Across Server Restarts', () => {
  let tmpDir;
  let dbPath;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'random-number-api-'));
    dbPath = path.join(tmpDir, 'random_numbers.db');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('keeps prior entries in history after the server restarts', async () => {
    // "Run 1": server starts, generates numbers, then stops.
    const db1 = createDb(dbPath);
    const app1 = createApp(db1);

    const generated = [];
    for (let i = 0; i < 2; i++) {
      const res = await request(app1).get('/random');
      generated.push(res.body.data.number);
    }
    db1.close();

    // "Run 2": server restarts against the same on-disk DB file.
    const db2 = createDb(dbPath);
    const app2 = createApp(db2);

    const historyRes = await request(app2).get('/random/history');

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.numbers).toHaveLength(2);
    expect(historyRes.body.data.numbers.map((entry) => entry.number)).toEqual(
      [...generated].reverse()
    );

    db2.close();
  });

  it('starts cleanly with an empty history when the DB file is deleted between runs', async () => {
    // "Run 1": server starts, generates a number, then stops.
    const db1 = createDb(dbPath);
    const app1 = createApp(db1);
    await request(app1).get('/random');
    db1.close();

    // DB file is deleted before the next run.
    fs.rmSync(dbPath, { force: true });

    // "Run 2": server restarts; the file is gone, so a fresh DB must be initialised.
    const db2 = createDb(dbPath);
    const app2 = createApp(db2);

    const historyRes = await request(app2).get('/random/history');

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.numbers).toEqual([]);

    db2.close();
  });
});
