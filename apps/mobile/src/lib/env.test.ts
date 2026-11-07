import { loadBuildEnv, readEnv } from '../env';

test('missing or blank public settings keep the app offline with native passkeys disabled', () => {
  for (const source of [{}, { EXPO_PUBLIC_API_URL: ' ', EXPO_PUBLIC_PASSKEY_RP_ID: '' }]) {
    const env = readEnv(source);
    expect(env.EXPO_PUBLIC_API_URL).toBeUndefined();
    expect(env.EXPO_PUBLIC_PASSKEY_RP_ID).toBeUndefined();
  }
});

test('normalizes the API URL and validates only the declared public configuration', () => {
  const env = readEnv({
    EXPO_PUBLIC_API_URL: ' https://api.example.com/ ',
    EXPO_PUBLIC_PASSKEY_RP_ID: 'auth.example.com',
    BETTER_AUTH_SECRET: 'server-only-secret',
  });
  expect(env.EXPO_PUBLIC_API_URL).toBe('https://api.example.com');
  expect(env.EXPO_PUBLIC_PASSKEY_RP_ID).toBe('auth.example.com');
  expect(Object.keys(env)).not.toContain('BETTER_AUTH_SECRET');
  expect(() => readEnv({ EXPO_PUBLIC_API_URL: 'invalid-private-url' })).toThrow(
    'Invalid mobile configuration: EXPO_PUBLIC_API_URL',
  );
  expect(() => readEnv({ EXPO_PUBLIC_PASSKEY_RP_ID: 'https://auth.example.com' })).toThrow(
    'Invalid mobile configuration: EXPO_PUBLIC_PASSKEY_RP_ID',
  );
});

test('app config supplies the Compose API origin before Expo inlines public variables', () => {
  const source = {
    EXPO_PUBLIC_API_URL: '',
    DEV_API_ORIGIN: 'https://api.checkout.localhost',
  };
  expect(loadBuildEnv(source).EXPO_PUBLIC_API_URL).toBe('https://api.checkout.localhost');
  expect(source.EXPO_PUBLIC_API_URL).toBe('https://api.checkout.localhost');
});

test('app config keeps an explicit device API URL ahead of the Compose origin', () => {
  const source = {
    EXPO_PUBLIC_API_URL: 'https://api.example.com',
    DEV_API_ORIGIN: 'https://api.checkout.localhost',
  };
  expect(loadBuildEnv(source).EXPO_PUBLIC_API_URL).toBe('https://api.example.com');
});
