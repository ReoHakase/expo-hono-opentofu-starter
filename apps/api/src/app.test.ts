import { afterAll, describe, expect, test } from 'bun:test';

import { createApp } from './app';
import { connectDatabase } from './db/client';
import { readEnv } from './env';
import { createAuth } from './modules/auth';

const { db, pool } = connectDatabase('postgresql://unused:unused@127.0.0.1:1/unused');
const env = readEnv({
  NODE_ENV: 'test',
  DATABASE_URL: 'unused',
  BETTER_AUTH_SECRET: 'unit-test-secret-not-for-real-deployments',
  BETTER_AUTH_URL: 'http://localhost:8080',
  TRUSTED_ORIGINS: 'http://localhost:8081,expo-hono-opentofu-starter://',
});
const auth = createAuth(db, env);
const app = createApp(db, auth, env, () => Promise.resolve());
afterAll(async () => {
  await pool.end();
});

describe('HTTP contract', () => {
  test('liveness is independent and readiness redacts errors', async () => {
    expect((await app.request('/health')).status).toBe(200);
    const unavailable = createApp(db, auth, env, () =>
      Promise.reject(new Error('private connection details')),
    );
    const response = await unavailable.request('/ready');
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'unavailable' });
  });
  test('validates pagination and protects writes before touching the database', async () => {
    expect((await app.request('/api/posts?offset=-1')).status).toBe(400);
    expect((await app.request('/api/me')).status).toBe(401);
    expect(
      (
        await app.request('/api/posts', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{"body":"hello"}',
        })
      ).status,
    ).toBe(401);
  });
  test('rejects oversized request bodies while preserving response headers', async () => {
    const response = await app.request('/api/auth/mobile-magic-link', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:8081' },
      body: 'x'.repeat(65 * 1024),
    });
    expect(response.status).toBe(413);
    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:8081');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  test('returns 400 for malformed JSON', async () => {
    const response = await app.request('/api/auth/mobile-magic-link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    });
    expect(response.status).toBe(400);
  });
  test('rejects unauthenticated profile uploads before reading the body', async () => {
    const response = await app.request('/api/me/profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: 'x'.repeat(400 * 1024),
    });
    expect(response.status).toBe(401);
  });
  test('rejects cross-origin writes and exposes only configured login methods', async () => {
    const rejected = await app.request('/api/posts', {
      method: 'POST',
      headers: { origin: 'https://untrusted.example', 'content-type': 'application/json' },
      body: 'x'.repeat(65 * 1024),
    });
    expect(rejected.status).toBe(403);
    expect(rejected.headers.get('access-control-allow-origin')).toBeNull();
    const allowed = await app.request('/api/auth-capabilities', {
      headers: { origin: 'http://localhost:8081' },
    });
    expect(allowed.headers.get('access-control-allow-origin')).toBe('http://localhost:8081');
    expect(await allowed.json()).toEqual({
      google: false,
      apple: false,
      email: false,
      emulated: false,
    });
  });
});
