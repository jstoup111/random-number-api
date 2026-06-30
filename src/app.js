const express = require('express');
const randomRouter = require('./routes/random');

const app = express();

app.use('/', randomRouter);

module.exports = app;
