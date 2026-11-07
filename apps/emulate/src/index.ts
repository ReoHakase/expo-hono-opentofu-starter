import { createEmulator } from 'emulate';

import { readEnv } from './env';

const env = readEnv();
const service = env.EMULATE_SERVICE;
const apiOrigin = env.BETTER_AUTH_URL;
const baseUrl = env.EMULATE_PUBLIC_URL ?? `http://localhost:${env.PORT}`;
const emulator = await createEmulator({
  service,
  port: env.PORT,
  hostname: env.EMULATE_HOST,
  baseUrl,
  seed: {
    [service]: {
      ...(service === 'resend' ? { domains: [{ name: 'example.com' }] } : {}),
      users: [
        {
          email: 'hanako@example.com',
          name: 'はなこ',
          email_verified: true,
          given_name: 'はなこ',
          family_name: '山田',
        },
        { email: 'taro@example.com', name: 'たろう', email_verified: true },
      ],
      oauth_clients: [
        {
          client_id: 'starter-local',
          client_secret: 'starter-local-secret',
          team_id: 'LOCALTEAM',
          name: 'SNSサンプル',
          redirect_uris: [`${apiOrigin}/api/auth/callback/emulate-${service}`],
        },
      ],
    },
  },
});
console.log(`${service}: ${baseUrl}`);
async function shutdown() {
  await emulator.close();
}
process.on('SIGINT', () => {
  void shutdown();
});
process.on('SIGTERM', () => {
  void shutdown();
});
