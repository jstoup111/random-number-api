const express = require('express');

const router = express.Router();

router.get('/random', (req, res) => {
  const min = req.query.min !== undefined ? Number(req.query.min) : 1;
  const max = req.query.max !== undefined ? Number(req.query.max) : 100;
  const number = Math.floor(Math.random() * (max - min + 1)) + min;
  res.json({
    data: {
      number
    }
  });
});

module.exports = router;
