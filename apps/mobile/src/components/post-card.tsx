import type { ReactNode } from 'react';

import { View } from 'react-native';

import { useColors } from '@/theme/colors';

export function PostCard({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <View
      className="mx-3 mb-2 flex-row gap-2 rounded-2xl px-3 pt-3"
      style={{ backgroundColor: colors.card }}
    >
      {children}
    </View>
  );
}
