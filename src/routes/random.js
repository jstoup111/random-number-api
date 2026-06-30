const express = require('express');

const router = express.Router();

router.get('/random', (req, res) => {
  const number = Math.floor(Math.random() * 100) + 1;
  res.json({
    data: {
      number
    }
  });
});

module.exports = router;
