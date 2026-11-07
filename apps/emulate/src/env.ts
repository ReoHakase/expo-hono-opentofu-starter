import { cleanEnv, host, port, str, url } from 'envalid';

export function readEnv(source: NodeJS.ProcessEnv = process.env) {
  const configuredApi = source.BETTER_AUTH_URL?.trim();
  const env = cleanEnv(
    {
      ...source,
      BETTER_AUTH_URL:
        (configuredApi === '' ? undefined : configuredApi) ??
        source.DEV_API_ORIGIN ??
        'http://localhost:8080',
    },
    {
      NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
      EMULATE_SERVICE: str({ choices: ['google', 'apple', 'resend'] }),
      PORT: port({ default: 4002 }),
      EMULATE_HOST: host({ default: '127.0.0.1' }),
      EMULATE_PUBLIC_URL: url({ default: undefined }),
      BETTER_AUTH_URL: url(),
    },
    {
      reporter: ({ errors }) => {
        const fields = Object.keys(errors);
        if (fields.length > 0) {
          throw new Error(`Invalid emulator configuration: ${fields.join(', ')}`);
        }
      },
    },
  );
  if (env.isProduction) {
    throw new Error('Emulate cannot run in production');
  }
  return env;
}
