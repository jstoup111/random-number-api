const request = require('supertest');
const { createApp } = require('../src/app');
const { createDb } = require('../src/db');

describe('Express app', () => {
  let db;

  beforeEach(() => {
    db = createDb(':memory:');
  });

  it('can be required without throwing', () => {
    expect(() => {
      require('../src/app');
    }).not.toThrow();
  });

  it('exports a createApp factory', () => {
    expect(typeof createApp).toBe('function');
  });

  it('createApp(db) returns an Express app instance', () => {
    const app = createApp(db);
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });
});

describe('404 catch-all middleware', () => {
  let db;
  let app;

  beforeEach(() => {
    db = createDb(':memory:');
    app = createApp(db);
  });

  it('returns 404 for nonexistent route', async () => {
    const response = await request(app).get('/nonexistent');
    expect(response.status).toBe(404);
  });

  it('returns correct error body for nonexistent route', async () => {
    const response = await request(app).get('/nonexistent');
    expect(response.body).toEqual({
      error: {
        type: 'not_found',
        message: 'Not found'
      }
    });
  });

  it('returns application/json Content-Type for nonexistent route', async () => {
    const response = await request(app).get('/nonexistent');
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('returns 404 for extra path segments', async () => {
    const response = await request(app).get('/random/extra/segments');
    expect(response.status).toBe(404);
  });

  it('returns correct error body for extra path segments', async () => {
    const response = await request(app).get('/random/extra/segments');
    expect(response.body).toEqual({
      error: {
        type: 'not_found',
        message: 'Not found'
      }
    });
  });

  it('returns application/json Content-Type for extra path segments', async () => {
    const response = await request(app).get('/random/extra/segments');
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('returns 404 with JSON for DELETE /anything', async () => {
    const response = await request(app).delete('/anything');
    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({
      error: {
        type: 'not_found',
        message: 'Not found'
      }
    });
  });
});
