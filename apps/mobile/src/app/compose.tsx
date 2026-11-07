import { Icon } from '@expo/ui';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';

import { Compose } from '@/components/compose';

export default function Route() {
  return (
    <>
      <Compose />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="閉じる"
          icon={Icon.select({ ios: 'xmark', android: import('@expo/material-symbols/close.xml') })}
          onPress={() => {
            router.back();
          }}
        >
          閉じる
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}
