import type { ComponentProps } from 'react';

import { View } from 'react-native';

export function Skeleton({ style }: Pick<ComponentProps<typeof View>, 'style'>) {
  return <View className="rounded-lg bg-foreground opacity-15" style={style} />;
}
