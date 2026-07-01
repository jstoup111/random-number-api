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

    it('without count param returns scalar shape { data: { number } } (not array)', async () => {
      const response = await request(app).get('/random?foo=bar');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        data: {
          number: expect.any(Number)
        }
      });
      expect(response.body.data).not.toHaveProperty('numbers');
    });

    it('rejects non-numeric count value with 400', async () => {
      const response = await request(app).get('/random?count=abc');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          type: 'validation',
          message: 'count must be a positive integer'
        }
      });
    });

    it('rejects decimal count value with 400', async () => {
      const response = await request(app).get('/random?count=2.5');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          type: 'validation',
          message: 'count must be a positive integer'
        }
      });
    });

    it('rejects empty string count value with 400', async () => {
      const response = await request(app).get('/random?count=');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          type: 'validation',
          message: 'count must be a positive integer'
        }
      });
    });

    it('rejects zero count value with 400', async () => {
      const response = await request(app).get('/random?count=0');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          type: 'validation',
          message: 'count must be a positive integer'
        }
      });
    });

    it('rejects negative count value with 400', async () => {
      const response = await request(app).get('/random?count=-3');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          type: 'validation',
          message: 'count must be a positive integer'
        }
      });
    });

    it('rejects count above 100 with 400 and distinct error message', async () => {
      const response = await request(app).get('/random?count=101');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          type: 'validation',
          message: 'count must not exceed 100'
        }
      });
    });

    it('rejects very large count value with 400 and distinct error message', async () => {
      const response = await request(app).get('/random?count=1000000');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          type: 'validation',
          message: 'count must not exceed 100'
        }
      });
    });

    it('valid count returns an array of numbers', async () => {
      const response = await request(app).get('/random?count=5');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('numbers');
      expect(Array.isArray(response.body.data.numbers)).toBe(true);
      expect(response.body.data.numbers).toHaveLength(5);
      response.body.data.numbers.forEach(number => {
        expect(typeof number).toBe('number');
        expect(Number.isInteger(number)).toBe(true);
        expect(number).toBeGreaterThanOrEqual(1);
        expect(number).toBeLessThanOrEqual(100);
      });
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

  describe('GET /random/history', () => {
    it('GET /random/history returns numbers in descending order', async () => {
      const { createRouter } = require('../src/routes/random');
      const { createDb } = require('../src/db');
      const express = require('express');

      const db = createDb(':memory:');
      const router = createRouter(db);
      const app = express();
      app.use(express.json());
      app.use('/', router);

      const request = require('supertest');

      // Generate 3 numbers
      const res1 = await request(app).get('/random').expect(200);
      const res2 = await request(app).get('/random').expect(200);
      const res3 = await request(app).get('/random').expect(200);

      // Get history
      const historyRes = await request(app)
        .get('/random/history')
        .expect(200);

      expect(historyRes.body).toEqual({
        data: {
          numbers: [
            { number: res3.body.data.number, generatedAt: expect.any(String) },
            { number: res2.body.data.number, generatedAt: expect.any(String) },
            { number: res1.body.data.number, generatedAt: expect.any(String) }
          ]
        }
      });

      // Verify ISO-8601 format
      historyRes.body.data.numbers.forEach(entry => {
        expect(entry.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });
    });

    it('GET /random/history returns 200 with empty array when DB is empty', async () => {
      const { createRouter } = require('../src/routes/random');
      const { createDb } = require('../src/db');
      const express = require('express');

      const db = createDb(':memory:');
      const router = createRouter(db);
      const app = express();
      app.use(express.json());
      app.use('/', router);

      const request = require('supertest');
      const response = await request(app)
        .get('/random/history')
        .expect(200);

      expect(response.body).toEqual({
        data: { numbers: [] }
      });
    });
  });

  describe('GET /random — DB write failure', () => {
    it('GET /random returns 500 when DB write fails', async () => {
      const originalPrepare = db.prepare;
      db.prepare = jest.fn(() => {
        throw new Error('DB error');
      });

      const response = await request(app)
        .get('/random')
        .expect(500);

      expect(response.body).toEqual({
        error: { type: 'internal', message: 'Internal server error' }
      });
      expect(response.body).not.toHaveProperty('data');

      db.prepare = originalPrepare;
    });
  });

  describe('GET /random/history — DB read failure', () => {
    it('GET /random/history returns 500 when DB read fails', async () => {
      const originalPrepare = db.prepare;
      db.prepare = jest.fn(() => {
        throw new Error('DB error');
      });

      const response = await request(app)
        .get('/random/history')
        .expect(500);

      expect(response.body).toEqual({
        error: { type: 'internal', message: 'Internal server error' }
      });
      expect(response.body).not.toHaveProperty('data');

      db.prepare = originalPrepare;
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

  describe('POST /random/history (wrong HTTP method)', () => {
    it('returns 404', async () => {
      const response = await request(app)
        .post('/random/history')
        .expect(404);

      expect(response.body).toEqual({
        error: { type: 'not_found', message: 'Not found' }
      });
    });
  });
});
