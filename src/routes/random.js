const express = require('express');

function createRouter(db) {
  const router = express.Router();

  let lastNumber = null;

  router._reset = () => { lastNumber = null; };
  router._getLastNumber = () => lastNumber;

  router.get('/random', (req, res) => {
    try {
      let candidate;
      do {
        candidate = Math.floor(Math.random() * 100) + 1;
      } while (candidate === lastNumber);
      const number = candidate;
      lastNumber = number;

      db.prepare('INSERT INTO generated_numbers (number, generated_at) VALUES (?, ?)')
        .run(number, new Date().toISOString());

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
    const rows = db.prepare(
      'SELECT number, generated_at AS generatedAt FROM generated_numbers ORDER BY id DESC'
    ).all();
    res.json({ data: { numbers: rows } });
  });

  return router;
}

module.exports = { createRouter };
