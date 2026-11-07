import type { ConfigContext, ExpoConfig } from 'expo/config';

import withLocalhostCA from './plugins/with-localhost-ca.ts';
import { loadBuildEnv } from './src/env.ts';

export default function configure({ config }: ConfigContext): ExpoConfig {
  const { EXPO_PUBLIC_PASSKEY_RP_ID: rpId } = loadBuildEnv();
  return withLocalhostCA({
    ...config,
    name: config.name ?? 'expo-hono-opentofu-starter',
    slug: config.slug ?? 'expo-hono-opentofu-starter',
    ios: { ...config.ios, ...(rpId ? { associatedDomains: [`webcredentials:${rpId}`] } : {}) },
  });
}
