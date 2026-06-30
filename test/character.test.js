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

  it('GET /random/character?case=lower returns only lowercase characters across 20 calls', async () => {
    for (let i = 0; i < 20; i++) {
      const response = await request(app).get('/random/character?case=lower');
      expect(response.status).toBe(200);
      expect(response.body.data.character).toMatch(/^[a-z]$/);
    }
  });

  it('POST /random/character returns 404 Not Found', async () => {
    const response = await request(app).post('/random/character');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { type: 'not_found', message: 'Not found' } });
  });
});
