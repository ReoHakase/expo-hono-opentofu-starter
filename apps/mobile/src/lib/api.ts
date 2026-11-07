import type { AppType } from '@starter/api/contract';

import { expoClient } from '@better-auth/expo/client';
import { passkeyClient } from '@better-auth/passkey/client';
import { magicLinkClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { hc } from 'hono/client';
import { Platform } from 'react-native';

import { readEnv } from '@/env';

export const apiUrl = readEnv().EXPO_PUBLIC_API_URL ?? null;
const baseURL = apiUrl ?? 'http://localhost:8080';

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    expoClient({
      scheme: 'expo-hono-opentofu-starter',
      storagePrefix: 'expo-hono-opentofu-starter',
      storage: SecureStore,
    }),
    magicLinkClient(),
    passkeyClient(),
  ],
  fetchOptions: { timeout: 10000 },
});
export const api = hc<AppType>(baseURL, {
  headers: async () => (Platform.OS === 'web' ? {} : { cookie: await authClient.getCookie() }),
  init: { credentials: Platform.OS === 'web' ? 'include' : 'omit' },
});
export const publicApi = hc<AppType>(baseURL, { init: { credentials: 'omit' } });
