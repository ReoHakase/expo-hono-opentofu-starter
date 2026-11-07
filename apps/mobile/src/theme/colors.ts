import { Color } from 'expo-router';
import { useMemo } from 'react';
import { Platform, useColorScheme } from 'react-native';

// Android Color getters resolve against the current Appearance at access time.
// Subscribe and read them during render instead of freezing the initial palette.
export function useColors() {
  'use no memo';
  // The compiler cannot track the native Appearance reads behind Color getters.
  // Keep the explicit scheme dependency instead of treating those getters as pure.
  const scheme = useColorScheme();
  return useMemo(
    () => ({
      background: Platform.select({
        ios: Color.ios.systemGroupedBackground,
        android: Color.android.dynamic.surface,
        default: '#f4f5f7',
      }),
      card: Platform.select({
        ios: Color.ios.secondarySystemGroupedBackground,
        android: Color.android.dynamic.surfaceContainerLow,
        default: '#ffffff',
      }),
      text: Platform.select({
        ios: Color.ios.label,
        android: Color.android.dynamic.onSurface,
        default: '#1c1c1e',
      }),
      secondary: Platform.select({
        ios: Color.ios.secondaryLabel,
        android: Color.android.dynamic.onSurfaceVariant,
        default: '#636366',
      }),
      destructive: Platform.select({
        ios: Color.ios.systemRed,
        android: Color.android.dynamic.error,
        default: '#b3261e',
      }),
    }),
    [scheme],
  );
}
