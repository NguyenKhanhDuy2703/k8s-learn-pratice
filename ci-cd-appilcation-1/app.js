const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello CI/CD');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;