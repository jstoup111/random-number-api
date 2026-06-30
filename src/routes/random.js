const express = require('express');

function createRouter(db) {
  const router = express.Router();

  let lastNumber = null;

  router._reset = () => { lastNumber = null; };
  router._getLastNumber = () => lastNumber;

  router.get('/random', (req, res) => {
    let candidate;
    do {
      candidate = Math.floor(Math.random() * 100) + 1;
    } while (candidate === lastNumber);
    const number = candidate;
    lastNumber = number;
    res.json({
      data: {
        number
      }
    });
  });

  return router;
}

module.exports = { createRouter };
