import { Icon } from '@expo/ui';
import { ActivityIndicator, View } from 'react-native';

import { NativeActionButton } from '@/components/native-action-button';
import { NativeHost } from '@/components/native-host';
import { Screen } from '@/components/screen';
import { Text } from '@/components/ui/text';

export function Feedback({
  message,
  loading = false,
  onRetry,
  fullScreen = false,
}: {
  message: string;
  loading?: boolean;
  onRetry?: () => void;
  fullScreen?: boolean;
}) {
  const content = (
    <View style={{ gap: 16, paddingVertical: 16 }}>
      {loading ? <ActivityIndicator accessibilityLabel="読み込み中" /> : null}
      <Text selectable accessibilityRole={onRetry ? 'alert' : undefined}>
        {message}
      </Text>
      {onRetry ? (
        <NativeHost matchContents={{ vertical: true }}>
          <NativeActionButton
            label="もう一度試す"
            icon={Icon.select({
              ios: 'arrow.clockwise',
              android: import('@expo/material-symbols/refresh.xml'),
            })}
            onPress={onRetry}
          />
        </NativeHost>
      ) : null}
    </View>
  );
  return fullScreen ? <Screen>{content}</Screen> : content;
}
