const request = require('supertest');
const app = require('./app');
const { test, expect } = require('@jest/globals');

describe('Integration checks for the CI/CD app', () => {
  test('root endpoint responds successfully', async () => {
    const res = await request(app).get('/');

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Hello CI/CD');
  });

  test('health endpoint reports the service status', async () => {
    const res = await request(app).get('/health');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('unknown route returns 404', async () => {
    const res = await request(app).get('/does-not-exist');

    expect(res.statusCode).toBe(404);
  });
});
