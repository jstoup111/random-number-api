const express = require('express');

const router = express.Router();

function parseQueryInt(val) {
  if (val === undefined) return 0; // sentinel: not provided
  if (!/^-?\d+$/.test(val)) return null;
  return parseInt(val, 10);
}

router.get('/random', (req, res) => {
  let min, max;

  if (req.query.min !== undefined) {
    min = parseQueryInt(req.query.min);
    if (min === null) {
      return res.status(400).json({ error: { type: 'validation', message: 'min and max must be integers' } });
    }
  } else {
    min = 1;
  }

  if (req.query.max !== undefined) {
    max = parseQueryInt(req.query.max);
    if (max === null) {
      return res.status(400).json({ error: { type: 'validation', message: 'min and max must be integers' } });
    }
  } else {
    max = 100;
  }

  if (min > max) {
    return res.status(400).json({ error: { type: 'validation', message: 'min must be less than or equal to max' } });
  }

  const number = Math.floor(Math.random() * (max - min + 1)) + min;
  res.json({
    data: {
      number
    }
  });
});

module.exports = router;
