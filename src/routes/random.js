const express = require('express');

const router = express.Router();

let lastNumber = null;

router._reset = () => { lastNumber = null; };
router._getLastNumber = () => lastNumber;

router.get('/random', (req, res) => {
  const number = Math.floor(Math.random() * 100) + 1;
  res.json({
    data: {
      number
    }
  });
});

module.exports = router;
