const express = require('express');

const CASE_SETS = {
  mixed: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
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
    const resolvedCase = req.query.case === undefined ? 'mixed' : req.query.case;

    db.prepare('INSERT INTO generated_characters (character, case_used, generated_at) VALUES (?, ?, ?)')
      .run(character, resolvedCase, new Date().toISOString());

    res.status(200).json({ data: { character } });
  });

  router.get('/random/character/history', (req, res) => {
    const characters = db
      .prepare('SELECT character, generated_at AS generatedAt FROM generated_characters ORDER BY id DESC')
      .all();
    res.status(200).json({ data: { characters } });
  });

  return router;
}

module.exports = { createRouter };
