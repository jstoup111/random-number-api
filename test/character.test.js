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
});
