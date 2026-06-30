const request = require('supertest');
const express = require('express');
const { createRouter } = require('../src/routes/character');
const { createDb } = require('../src/db');

describe('Character router', () => {
  let db;
  let app;

  beforeEach(() => {
    db = createDb(':memory:');
    app = express();
    app.use('/', createRouter(db));
    app.use((req, res) => res.status(404).json({ error: { type: 'not_found', message: 'Not found' } }));
  });

  it('exports a createRouter factory', () => {
    expect(typeof createRouter).toBe('function');
  });

  it('GET /random/character does not 404', async () => {
    const response = await request(app).get('/random/character');
    expect(response.status).not.toBe(404);
  });

  it('GET /random/character/history does not 404', async () => {
    const response = await request(app).get('/random/character/history');
    expect(response.status).not.toBe(404);
  });

  it('GET /random/character with no query params returns a mixed-case letter', async () => {
    const response = await request(app).get('/random/character');
    expect(response.status).toBe(200);
    expect(response.body.data.character).toMatch(/^[a-zA-Z]$/);
  });

  it('GET /random/character?case=mixed returns a single mixed-case letter', async () => {
    const response = await request(app).get('/random/character?case=mixed');
    expect(response.status).toBe(200);
    expect(response.body.data.character).toMatch(/^[a-zA-Z]$/);
  });

  it('GET /random/character?case=upper returns only uppercase characters across 20 calls', async () => {
    for (let i = 0; i < 20; i++) {
      const response = await request(app).get('/random/character?case=upper');
      expect(response.status).toBe(200);
      expect(response.body.data.character).toMatch(/^[A-Z]$/);
    }
  });

  it('GET /random/character?case=lower returns only lowercase characters across 20 calls', async () => {
    for (let i = 0; i < 20; i++) {
      const response = await request(app).get('/random/character?case=lower');
      expect(response.status).toBe(200);
      expect(response.body.data.character).toMatch(/^[a-z]$/);
    }
  });

  it('GET /random/character?case=digits returns 400 with a validation error', async () => {
    const response = await request(app).get('/random/character?case=digits');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { type: 'validation', message: 'case must be one of: upper, lower, mixed' }
    });
  });

  it('POST /random/character returns 404 Not Found', async () => {
    const response = await request(app).post('/random/character');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { type: 'not_found', message: 'Not found' } });
  });

  it('GET /random/character persists the generated character to generated_characters', async () => {
    const response = await request(app).get('/random/character');
    expect(response.status).toBe(200);

    const rows = db.prepare('SELECT * FROM generated_characters').all();
    expect(rows).toHaveLength(1);
    expect(rows[0].character).toBe(response.body.data.character);
    expect(() => new Date(rows[0].generated_at).toISOString()).not.toThrow();
    expect(new Date(rows[0].generated_at).toISOString()).toBe(rows[0].generated_at);
  });
});
