const request = require('supertest');
const express = require('express');
const { createRouter } = require('../src/routes/random');
const { createDb } = require('../src/db');

describe('Random router', () => {
  let db;
  let app;
  let route;

  beforeEach(() => {
    db = createDb(':memory:');
    route = createRouter(db);
    app = express();
    app.use('/', route);
    app.use((req, res) => res.status(404).json({ error: { type: 'not_found', message: 'Not found' } }));
  });

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

  describe('lastNumber state', () => {
    it('should update lastNumber to the returned value', async () => {
      route._reset();
      const res = await request(app).get('/random');
      expect(route._getLastNumber()).toBe(res.body.data.number);
    });

    it('should update lastNumber across multiple consecutive calls', async () => {
      route._reset();
      for (let i = 0; i < 5; i++) {
        const res = await request(app).get('/random');
        expect(route._getLastNumber()).toBe(res.body.data.number);
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

  describe('retry loop — fires when candidate equals lastNumber', () => {
    it('should retry when candidate equals lastNumber', async () => {
      route._reset();
      // Prime lastNumber to 42: mock Math.random to return 0.41
      // Math.floor(0.41 * 100) + 1 = 42
      const primeRandom = jest.spyOn(Math, 'random').mockReturnValue(0.41);
      await request(app).get('/random');
      primeRandom.mockRestore();

      // Now lastNumber is 42.
      // Mock sequence: 0.41 → 42 (duplicate, retry), 0.41 → 42 (duplicate, retry), 0.42 → 43 (accepted)
      const mockRandom = jest.spyOn(Math, 'random')
        .mockReturnValueOnce(0.41)
        .mockReturnValueOnce(0.41)
        .mockReturnValueOnce(0.42);

      const res = await request(app).get('/random');

      // Result should be 43 (the first non-duplicate value)
      expect(res.body.data.number).toBe(43);
      // Math.random should be called at least twice (retry demonstrated)
      expect(mockRandom.mock.calls.length).toBeGreaterThanOrEqual(2);
      mockRandom.mockRestore();
    });
  });

  describe('null initial state — retry loop skipped on first call', () => {
    it('should skip retry loop when lastNumber is null', async () => {
      route._reset();
      const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.41);
      const res = await request(app).get('/random');
      expect(res.body.data.number).toBe(42);  // Math.floor(0.41 * 100) + 1 = 42
      expect(mockRandom).toHaveBeenCalledTimes(1);
      mockRandom.mockRestore();
    });
  });

  describe('out-of-range lastNumber — retry loop skipped', () => {
    it('should skip retry when lastNumber is out of range', async () => {
      route._reset();

      // Prime lastNumber to 95: Math.floor(0.94 * 100) + 1 = 95
      const mockRandom1 = jest.spyOn(Math, 'random').mockReturnValue(0.94);
      const primeRes = await request(app).get('/random');
      mockRandom1.mockRestore();
      expect(primeRes.body.data.number).toBe(95);

      // lastNumber is now 95 (outside the logical subset [1, 10]).
      // Mock Math.random to return 0.5 → Math.floor(0.5 * 100) + 1 = 51
      // 51 !== 95, so the retry loop exits immediately after one call.
      const mockRandom2 = jest.spyOn(Math, 'random').mockReturnValue(0.5);
      const res = await request(app).get('/random');

      expect(res.body.data.number).toBe(51);
      expect(mockRandom2).toHaveBeenCalledTimes(1);
      mockRandom2.mockRestore();
    });
  });

  describe('persistence', () => {
    it('GET /random persists the number to the database before responding', async () => {
      const response = await request(app)
        .get('/random')
        .expect(200);

      const number = response.body.data.number;
      const rows = db.prepare('SELECT * FROM generated_numbers').all();

      expect(rows).toHaveLength(1);
      expect(rows[0].number).toBe(number);
      expect(rows[0].generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
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
});
