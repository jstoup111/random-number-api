const express = require('express');

const router = express.Router();

function parseQueryInt(val) {
  if (!/^\d+$/.test(val)) return null;
  return parseInt(val, 10);
}

function validateParam(val, paramName, defaultVal) {
  if (val === undefined) return { ok: true, value: defaultVal };
  const parsed = parseQueryInt(val);
  if (parsed === null) {
    return { ok: false, error: `${paramName} must be a positive integer` };
  }
  return { ok: true, value: parsed };
}

router.get('/random', (req, res) => {
  const minResult = validateParam(req.query.min, 'min', 1);
  if (!minResult.ok) {
    return res.status(400).json({ error: { type: 'validation', message: minResult.error } });
  }

  const maxResult = validateParam(req.query.max, 'max', 100);
  if (!maxResult.ok) {
    return res.status(400).json({ error: { type: 'validation', message: maxResult.error } });
  }

  const min = minResult.value;
  const max = maxResult.value;

  if (min >= max) {
    return res.status(400).json({ error: { type: 'validation', message: 'min must be less than max' } });
  }

  const number = Math.floor(Math.random() * (max - min + 1)) + min;
  res.json({
    data: {
      number
    }
  });
});

module.exports = router;
