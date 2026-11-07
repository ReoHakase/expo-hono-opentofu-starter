import { Stack } from 'expo-router/stack';

import { useStackOptions } from '@/theme/navigation';
export default function Layout() {
  const stackOptions = useStackOptions();
  return (
    <Stack screenOptions={stackOptions}>
      <Stack.Screen name="settings" options={{ title: '設定', headerLargeTitleEnabled: true }} />
    </Stack>
  );
}
