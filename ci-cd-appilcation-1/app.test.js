const request = require('supertest');
const app = require('./app');
const { test, expect } = require('@jest/globals');

test('GET / returns hello', async () => {
  const res = await request(app).get('/');
  expect(res.statusCode).toBe(200);
});

test('GET /health returns ok', async () => {
  const res = await request(app).get('/health');
  expect(res.body.status).toBe('ok');
});