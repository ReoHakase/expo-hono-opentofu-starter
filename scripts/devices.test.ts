import { describe, expect, test } from 'bun:test';

import { deviceOrigin } from './devices';

describe('device HTTPS routes', () => {
  test('preserves worktree names and a configured HTTPS proxy port', () => {
    expect(deviceOrigin('https://api.starter-abc.localhost\n')).toBe(
      'https://api.starter-abc.localhost',
    );
    expect(deviceOrigin('https://api.starter-def.localhost:8443\r\n')).toBe(
      'https://api.starter-def.localhost:8443',
    );
  });

  test.each([
    '',
    'http://api.starter.localhost',
    'https://127.0.0.1',
    'https://api.example.com',
    'https://api.localhost.evil.example',
    'https://user:password@api.localhost',
    'https://api.localhost/path',
    'https://api.localhost?token=value',
    'https://api.localhost#fragment',
  ])('refuses insecure or nonlocal routes: %s', (output) => {
    expect(() => deviceOrigin(output)).toThrow();
  });
});
