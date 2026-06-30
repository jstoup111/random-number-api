const request = require('supertest');
const app = require('../src/app');

describe('GET /random', () => {
  it('returns 200 status', async () => {
    const response = await request(app).get('/random');
    expect(response.status).toBe(200);
  });

  it('returns correct response structure', async () => {
    const response = await request(app).get('/random');
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('number');
  });

  it('returns a number in [1, 100]', async () => {
    const response = await request(app).get('/random');
    const { number } = response.body.data;
    expect(typeof number).toBe('number');
    expect(Number.isInteger(number)).toBe(true);
    expect(number).toBeGreaterThanOrEqual(1);
    expect(number).toBeLessThanOrEqual(100);
  });

  it('returns values in [1, 100] across multiple calls', async () => {
    for (let i = 0; i < 5; i++) {
      const response = await request(app).get('/random');
      const { number } = response.body.data;
      expect(Number.isInteger(number)).toBe(true);
      expect(number).toBeGreaterThanOrEqual(1);
      expect(number).toBeLessThanOrEqual(100);
    }
  });
});

describe('GET /random?min=5&max=10 (bounded range)', () => {
  it('returns HTTP 200', async () => {
    const response = await request(app).get('/random?min=5&max=10');
    expect(response.status).toBe(200);
  });

  it('returns the correct response envelope { data: { number: N } }', async () => {
    const response = await request(app).get('/random?min=5&max=10');
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('number');
  });

  it('returns a number in [5, 10] across 25 calls', async () => {
    for (let i = 0; i < 25; i++) {
      const response = await request(app).get('/random?min=5&max=10');
      expect(response.status).toBe(200);
      const { number } = response.body.data;
      expect(typeof number).toBe('number');
      expect(Number.isInteger(number)).toBe(true);
      expect(number).toBeGreaterThanOrEqual(5);
      expect(number).toBeLessThanOrEqual(10);
    }
  });
});

describe('GET /random?max=50 (max-only, default min)', () => {
  it('returns 200 status', async () => {
    const response = await request(app).get('/random?max=50');
    expect(response.status).toBe(200);
  });

  it('returns a number in [1, 50] across 20+ calls', async () => {
    for (let i = 0; i < 20; i++) {
      const response = await request(app).get('/random?max=50');
      const { number } = response.body.data;
      expect(typeof number).toBe('number');
      expect(Number.isInteger(number)).toBe(true);
      expect(number).toBeGreaterThanOrEqual(1);
      expect(number).toBeLessThanOrEqual(50);
    }
  });
});

describe('POST /random (wrong HTTP method)', () => {
  it('returns 404 status', async () => {
    const response = await request(app).post('/random');
    expect(response.status).toBe(404);
  });

  it('returns correct 404 error envelope', async () => {
    const response = await request(app).post('/random');
    expect(response.body).toEqual({
      error: {
        type: 'not_found',
        message: 'Not found'
      }
    });
  });
});

describe('GET /random with min-only parameter', () => {
  it('returns number in [5, 100] across 20 calls when only min=5 is given', async () => {
    for (let i = 0; i < 20; i++) {
      const response = await request(app).get('/random?min=5');
      expect(response.status).toBe(200);
      const { number } = response.body.data;
      expect(typeof number).toBe('number');
      expect(Number.isInteger(number)).toBe(true);
      expect(number).toBeGreaterThanOrEqual(5);
      expect(number).toBeLessThanOrEqual(100);
    }
  });
});
