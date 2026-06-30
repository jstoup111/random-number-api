const express = require('express');

const CASE_SETS = {
  mixed: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz'
};

const CASE_VALIDATION_ERROR = Symbol('CASE_VALIDATION_ERROR');

function parseCase(req) {
  const requested = req.query.case === undefined ? 'mixed' : req.query.case;
  return CASE_SETS[requested] === undefined ? CASE_VALIDATION_ERROR : CASE_SETS[requested];
}

function createRouter(db) {
  const router = express.Router();

  router.get('/random/character', (req, res) => {
    const charset = parseCase(req);

    if (charset === CASE_VALIDATION_ERROR) {
      return res.status(400).json({
        error: { type: 'validation', message: 'case must be one of: upper, lower, mixed' }
      });
    }

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
