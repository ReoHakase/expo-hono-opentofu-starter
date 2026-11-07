import type { ReactNode } from 'react';
import type { ScrollViewProps } from 'react-native';

import { ScrollView } from 'react-native';

import { useColors } from '@/theme/colors';

// UIScrollView/Android ScrollView owns keyboard avoidance and native header insets.
// Empty, loading and error screens need the same inset behavior as content screens.
export function Screen({
  children,
  contentContainerStyle,
}: {
  children: ReactNode;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
}) {
  const colors = useColors();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[{ padding: 20, gap: 24 }, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  );
}
