const request = require('supertest');
const { createApp } = require('../../src/app');
const { createDb } = require('../../src/db');

describe('Story: Retrieve character generation history', () => {
  let db;
  let app;

  beforeEach(() => {
    db = createDb(':memory:');
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
  });

  it('returns an empty list when no characters have ever been generated', async () => {
    const historyRes = await request(app).get('/random/character/history');

    expect(historyRes.status).toBe(200);
    expect(historyRes.body).toEqual({ data: { characters: [] } });
  });

  it('returns generated characters most-recent-first, matching what GET /random/character returned', async () => {
    const generated = [];
    for (let i = 0; i < 3; i++) {
      const res = await request(app).get('/random/character');
      generated.push(res.body.data.character);
    }

    const historyRes = await request(app).get('/random/character/history');

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.characters).toHaveLength(3);

    const expectedDescending = [...generated].reverse();
    historyRes.body.data.characters.forEach((entry, index) => {
      expect(entry.character).toBe(expectedDescending[index]);
      expect(typeof entry.generatedAt).toBe('string');
    });
  });
});
