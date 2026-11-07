import type { ComponentProps, ReactNode } from 'react';

import { Icon } from '@expo/ui';
import { View } from 'react-native';

import { NativeActionButton } from '@/components/native-action-button';
import { NativeHost } from '@/components/native-host';
import { SocialIcon } from '@/components/social-icon';
import { Text } from '@/components/ui/text';
import { useColors } from '@/theme/colors';

export function ContentState({
  icon,
  title,
  description,
  children,
}: {
  icon: ComponentProps<typeof SocialIcon>['name'];
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingVertical: 32, gap: 16 }}>
      <SocialIcon name={icon} size={40} color={colors.secondary} />
      <View style={{ alignItems: 'center', gap: 8, maxWidth: 360 }}>
        <Text variant="h3" className="text-center">
          {title}
        </Text>
        {description ? (
          <Text className="text-center text-muted-foreground">{description}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function ContentError({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <ContentState
      icon={Icon.select({
        ios: 'exclamationmark.triangle',
        android: import('@expo/material-symbols/warning.xml'),
      })}
      title={title}
      description="通信状況を確認してください。"
    >
      <NativeHost matchContents style={{ maxWidth: '100%' }}>
        <NativeActionButton
          icon={Icon.select({
            ios: 'arrow.clockwise',
            android: import('@expo/material-symbols/refresh.xml'),
          })}
          label="もう一度試す"
          onPress={onRetry}
        />
      </NativeHost>
    </ContentState>
  );
}
