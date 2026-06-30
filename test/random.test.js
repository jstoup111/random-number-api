const request = require('supertest');
const app = require('../src/app');
const route = require('../src/routes/random');

describe('state helpers', () => {
  it('exports _getLastNumber', () => {
    expect(route._getLastNumber).toBeDefined();
  });

  it('_getLastNumber returns null initially', () => {
    route._reset();
    expect(route._getLastNumber()).toBeNull();
  });

  it('exports _reset', () => {
    expect(route._reset).toBeDefined();
  });
});

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

describe('consecutive calls', () => {
  beforeEach(() => route._reset());

  it('should return different numbers on consecutive calls', async () => {
    const pairs = 10;
    for (let i = 0; i < pairs; i++) {
      const res1 = await request(app).get('/random');
      const res2 = await request(app).get('/random');
      expect(res1.body.data.number).not.toBe(res2.body.data.number);
    }
  });

  it('should have no adjacent duplicates across 100 calls', async () => {
    const numbers = [];
    for (let i = 0; i < 100; i++) {
      const res = await request(app).get('/random');
      numbers.push(res.body.data.number);
    }
    for (let i = 0; i < numbers.length - 1; i++) {
      expect(numbers[i]).not.toBe(numbers[i + 1]);
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
