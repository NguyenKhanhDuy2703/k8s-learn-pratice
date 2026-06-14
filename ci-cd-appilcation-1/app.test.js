const request = require('supertest');
const app = require('./app');
const { test, expect } = require('@jest/globals');

test('GET / returns 200 and welcome message', async () => {
  const res = await request(app).get('/');

  expect(res.statusCode).toBe(200);
  expect(res.text).toBe('Hello CI/CD');
});

test('GET /health returns 200 and status ok', async () => {
  const res = await request(app).get('/health');

  expect(res.statusCode).toBe(200);
  expect(res.body).toEqual({ status: 'ok' });
});

test('GET /unknown returns 404 for missing route', async () => {
  const res = await request(app).get('/unknown');

  expect(res.statusCode).toBe(404);
});