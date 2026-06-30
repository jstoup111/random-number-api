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


describe('GET /random with invalid query params', () => {
  it('returns 400 when min is a non-integer string', async () => {
    const response = await request(app).get('/random?min=abc');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        type: 'validation',
        message: 'min must be a positive integer'
      }
    });
  });

  it('returns 400 when min is a decimal', async () => {
    const response = await request(app).get('/random?min=1.5&max=10');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        type: 'validation',
        message: 'min must be a positive integer'
      }
    });
  });

  it('returns 400 when max is an empty string', async () => {
    const response = await request(app).get('/random?max=');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        type: 'validation',
        message: 'max must be a positive integer'
      }
    });
  });

  it('returns 400 when min is a negative integer', async () => {
    const response = await request(app).get('/random?min=-5');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        type: 'validation',
        message: 'min must be a positive integer'
      }
    });
  });

  it('returns 400 when max is a negative integer', async () => {
    const response = await request(app).get('/random?max=-10');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        type: 'validation',
        message: 'max must be a positive integer'
      }
    });
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

describe('GET /random one-sided range edge cases', () => {
  it('returns HTTP 400 when min=101 (min exceeds default max of 100)', async () => {
    const response = await request(app).get('/random?min=101');
    expect(response.status).toBe(400);
  });

  it('returns HTTP 400 when max=0 (max is below default min of 1)', async () => {
    const response = await request(app).get('/random?max=0');
    expect(response.status).toBe(400);
  });
});

describe('GET /random with unknown query params', () => {
  it('returns HTTP 200 when unknown param foo=bar is passed', async () => {
    const response = await request(app).get('/random?foo=bar');
    expect(response.status).toBe(200);
  });

  it('returns data.number in [1, 100] when unknown param foo=bar is passed', async () => {
    const response = await request(app).get('/random?foo=bar');
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('number');
    const { number } = response.body.data;
    expect(typeof number).toBe('number');
    expect(Number.isInteger(number)).toBe(true);
    expect(number).toBeGreaterThanOrEqual(1);
    expect(number).toBeLessThanOrEqual(100);
  });
});

describe('GET /random range ordering validation', () => {
  it('returns 400 when min equals max (min=5&max=5)', async () => {
    const response = await request(app).get('/random?min=5&max=5');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        type: 'validation',
        message: 'min must be less than max'
      }
    });
  });

  it('returns 400 when min is greater than max (min=10&max=3)', async () => {
    const response = await request(app).get('/random?min=10&max=3');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        type: 'validation',
        message: 'min must be less than max'
      }
    });
  });

  it('returns 200 when min=1 and max=2 (minimum valid gap)', async () => {
    const response = await request(app).get('/random?min=1&max=2');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('number');
    const { number } = response.body.data;
    expect(number).toBeGreaterThanOrEqual(1);
    expect(number).toBeLessThanOrEqual(2);
  });
});
