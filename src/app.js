const express = require('express');
const randomRouter = require('./routes/random');

const app = express();

app.use('/', randomRouter);

// 404 catch-all middleware (must be last)
app.use((req, res) => res.status(404).json({ error: { type: 'not_found', message: 'Not found' } }));

module.exports = app;
