import type { ReporterOptions } from 'envalid';

import { bool, cleanEnv, makeValidator, port, str, url } from 'envalid';

const authSecret = makeValidator((value) => {
  if (value.length < 32) {
    throw new Error('Expected at least 32 characters');
  }
  return value;
});

function reporter({ errors }: ReporterOptions<unknown>) {
  const fields = Object.keys(errors);
  if (fields.length > 0) {
    throw new Error(`Invalid server configuration: ${fields.join(', ')}`);
  }
}

const databaseValidators = { DATABASE_URL: str() };

// Migration and integration-test setup do not need authentication credentials.
export function readDatabaseEnv(source: NodeJS.ProcessEnv = process.env) {
  return cleanEnv(source, databaseValidators, { reporter });
}

export function readEnv(source: NodeJS.ProcessEnv = process.env) {
  const development = source.NODE_ENV === 'development';
  const env = cleanEnv(
    {
      ...source,
      BETTER_AUTH_URL:
        development && !source.BETTER_AUTH_URL?.trim()
          ? source.DEV_API_ORIGIN
          : source.BETTER_AUTH_URL,
      TRUSTED_ORIGINS: development
        ? [source.TRUSTED_ORIGINS ?? 'expo-hono-opentofu-starter://', source.DEV_METRO_ORIGIN]
            .filter(Boolean)
            .join(',')
        : source.TRUSTED_ORIGINS,
    },
    {
      ...databaseValidators,
      NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
      PORT: port({ default: 8080 }),
      BETTER_AUTH_SECRET: authSecret(),
      BETTER_AUTH_URL: url(),
      TRUSTED_ORIGINS: str({ default: 'expo-hono-opentofu-starter://' }),
      AUTH_EMULATE: bool({ default: false }),
      GOOGLE_EMULATOR_URL: url({ default: undefined }),
      APPLE_EMULATOR_URL: url({ default: undefined }),
      GOOGLE_EMULATOR_PUBLIC_URL: url({ default: undefined }),
      APPLE_EMULATOR_PUBLIC_URL: url({ default: undefined }),
      RESEND_API_URL: url({ default: 'https://api.resend.com' }),
      RESEND_API_KEY: str({ default: undefined }),
      EMAIL_FROM: str({ default: 'サンプルSNS <login@example.com>' }),
      GOOGLE_CLIENT_ID: str({ default: undefined }),
      GOOGLE_CLIENT_SECRET: str({ default: undefined }),
      APPLE_CLIENT_ID: str({ default: undefined }),
      APPLE_CLIENT_SECRET: str({ default: undefined }),
      PASSKEY_RP_ID: str({ default: undefined }),
      PASSKEY_ORIGINS: str({ default: undefined }),
      APPLE_APP_ID: str({ default: undefined }),
      ANDROID_SHA256_CERT_FINGERPRINTS: str({ default: undefined }),
    },
    { reporter },
  );
  if (env.isProduction && !env.BETTER_AUTH_URL.startsWith('https://')) {
    throw new Error('BETTER_AUTH_URL must use HTTPS in production');
  }
  validateEmulation(env);
  return env;
}

export type Environment = ReturnType<typeof readEnv>;

function validateEmulation(env: Environment) {
  if (env.AUTH_EMULATE) {
    if (env.NODE_ENV === 'production') {
      throw new Error('AUTH_EMULATE is only available in development and tests');
    }
    for (const key of [
      'GOOGLE_EMULATOR_URL',
      'APPLE_EMULATOR_URL',
      'RESEND_API_URL',
      ...(env.GOOGLE_EMULATOR_PUBLIC_URL ? ['GOOGLE_EMULATOR_PUBLIC_URL' as const] : []),
      ...(env.APPLE_EMULATOR_PUBLIC_URL ? ['APPLE_EMULATOR_PUBLIC_URL' as const] : []),
    ] as const) {
      const value = env[key];
      const host = value ? new URL(value).hostname : '';
      if (
        !['localhost', '127.0.0.1', 'google', 'apple', 'mail'].includes(host) &&
        !host.endsWith('.localhost')
      ) {
        throw new Error(`${key} must point to a local emulator`);
      }
    }
  } else if (env.RESEND_API_URL !== 'https://api.resend.com') {
    throw new Error('Custom mail endpoints require AUTH_EMULATE');
  }
}
