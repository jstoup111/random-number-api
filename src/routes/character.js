const express = require('express');

function createRouter(db) {
  const router = express.Router();

  router.get('/random/character', (req, res) => {
    res.status(200).json({ data: {} });
  });

  router.get('/random/character/history', (req, res) => {
    res.status(200).json({ data: { characters: [] } });
  });

  return router;
}

module.exports = { createRouter };
