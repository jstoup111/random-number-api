const express = require('express');

function createRouter(db) {
  const router = express.Router();

  let lastNumber = null;

  router._reset = () => { lastNumber = null; };
  router._getLastNumber = () => lastNumber;

  const generateAndPersistOne = (db) => {
    let candidate;
    do {
      candidate = Math.floor(Math.random() * 100) + 1;
    } while (candidate === lastNumber);
    const number = candidate;
    lastNumber = number;

    db.prepare('INSERT INTO generated_numbers (number, generated_at) VALUES (?, ?)')
      .run(number, new Date().toISOString());

    return number;
  };

  router.get('/random', (req, res) => {
    try {
      // Validate count parameter if present
      if (req.query.count !== undefined) {
        const countStr = req.query.count;
        const parsed = parseInt(countStr, 10);

        // Check if parse failed (NaN) or if string representation doesn't match (rejects decimals like "2.5")
        if (isNaN(parsed) || String(parsed) !== countStr) {
          return res.status(400).json({
            error: {
              type: 'validation',
              message: 'count must be a positive integer'
            }
          });
        }

        // Check if count is less than 1 (rejects zero and negative values)
        if (parsed < 1) {
          return res.status(400).json({
            error: {
              type: 'validation',
              message: 'count must be a positive integer'
            }
          });
        }

        // Check if count exceeds 100
        if (parsed > 100) {
          return res.status(400).json({
            error: {
              type: 'validation',
              message: 'count must not exceed 100'
            }
          });
        }
      }

      const number = generateAndPersistOne(db);

      res.json({
        data: {
          number
        }
      });
    } catch (err) {
      res.status(500).json({ error: { type: 'internal', message: 'Internal server error' } });
    }
  });

  router.get('/random/history', (req, res) => {
    try {
      const rows = db.prepare(
        'SELECT number, generated_at AS generatedAt FROM generated_numbers ORDER BY id DESC'
      ).all();
      res.json({ data: { numbers: rows } });
    } catch (err) {
      res.status(500).json({ error: { type: 'internal', message: 'Internal server error' } });
    }
  });

  return router;
}

module.exports = { createRouter };
