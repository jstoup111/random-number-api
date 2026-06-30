const express = require('express');

const CASE_SETS = {
  mixed: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
};

function parseCase(req) {
  const requested = req.query.case === undefined ? 'mixed' : req.query.case;
  return CASE_SETS[requested];
}

function createRouter(db) {
  const router = express.Router();

  router.get('/random/character', (req, res) => {
    const charset = parseCase(req);
    const character = charset.charAt(Math.floor(Math.random() * charset.length));
    res.status(200).json({ data: { character } });
  });

  router.get('/random/character/history', (req, res) => {
    res.status(200).json({ data: { characters: [] } });
  });

  return router;
}

module.exports = { createRouter };
