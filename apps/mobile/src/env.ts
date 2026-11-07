import { cleanEnv, host, url } from 'envalid';

export function readEnv(
  source: Record<string, string | undefined> = {
    // Expo only inlines statically referenced public variables in application code.
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_PASSKEY_RP_ID: process.env.EXPO_PUBLIC_PASSKEY_RP_ID,
  },
) {
  return cleanEnv(
    {
      EXPO_PUBLIC_API_URL: source.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, ''),
      EXPO_PUBLIC_PASSKEY_RP_ID: source.EXPO_PUBLIC_PASSKEY_RP_ID?.trim(),
    },
    {
      EXPO_PUBLIC_API_URL: url({ default: undefined }),
      EXPO_PUBLIC_PASSKEY_RP_ID: host({ default: undefined }),
    },
    {
      reporter: ({ errors }) => {
        const fields = Object.keys(errors);
        if (fields.length > 0) {
          throw new Error(`Invalid mobile configuration: ${fields.join(', ')}`);
        }
      },
    },
  );
}

// App config runs in Node before Metro inlines EXPO_PUBLIC_* into the native bundle.
export function loadBuildEnv(source: Record<string, string | undefined> = process.env) {
  if (!source.EXPO_PUBLIC_API_URL?.trim() && source.DEV_API_ORIGIN) {
    source.EXPO_PUBLIC_API_URL = source.DEV_API_ORIGIN;
  }
  return readEnv(source);
}
