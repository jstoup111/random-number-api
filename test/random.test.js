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
