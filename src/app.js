const express = require('express');
const { createRouter } = require('./routes/random');

function createApp(db) {
  const app = express();

  app.use('/', createRouter(db));

  // 404 catch-all middleware (must be last)
  app.use((req, res) => res.status(404).json({ error: { type: 'not_found', message: 'Not found' } }));

  return app;
}

module.exports = { createApp };
