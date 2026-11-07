import { expect, test } from 'bun:test';

import { readEnv } from './env';

test('uses the Compose origin unless an explicit device callback origin is configured', () => {
  const source = {
    EMULATE_SERVICE: 'google',
    BETTER_AUTH_URL: ' ',
    DEV_API_ORIGIN: 'https://api.checkout.localhost',
  };
  expect(readEnv(source).BETTER_AUTH_URL).toBe(source.DEV_API_ORIGIN);
  expect(readEnv({ ...source, BETTER_AUTH_URL: 'https://api.example.com' }).BETTER_AUTH_URL).toBe(
    'https://api.example.com',
  );
  expect(readEnv({ EMULATE_SERVICE: 'resend' }).BETTER_AUTH_URL).toBe('http://localhost:8080');
});

test('rejects production emulators and reports invalid configuration without values', () => {
  expect(() => readEnv({ EMULATE_SERVICE: 'apple', NODE_ENV: 'production' })).toThrow(
    'Emulate cannot run in production',
  );
  expect(() => readEnv({ EMULATE_SERVICE: 'private-service', PORT: 'invalid-port' })).toThrow(
    'Invalid emulator configuration: EMULATE_SERVICE, PORT',
  );
});
