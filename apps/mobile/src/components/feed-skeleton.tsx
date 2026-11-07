import type { ReactNode } from 'react';

import { useWindowDimensions, View } from 'react-native';

import { PostCard } from '@/components/post-card';
import { Skeleton } from '@/components/skeleton';
import { avatarSize } from '@/theme/metrics';

export function FeedSkeleton({
  header,
  label = '投稿を読み込んでいます',
}: {
  header?: ReactNode;
  label?: string;
}) {
  const { fontScale } = useWindowDimensions();
  return (
    <View
      accessible
      testID="feed-loading"
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
    >
      {header}
      {['first', 'second', 'third'].map((card) => (
        <PostCard key={card}>
          <Skeleton
            style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
          />
          <View style={{ flex: 1, gap: 8, paddingBottom: 12 }}>
            <Skeleton style={{ width: '35%', height: 16 * fontScale }} />
            <Skeleton style={{ width: '95%', height: 15 * fontScale }} />
            <Skeleton style={{ width: '65%', height: 15 * fontScale }} />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 24,
                height: 36,
              }}
            >
              <Skeleton style={{ width: 38, height: 14 }} />
              <Skeleton style={{ width: 18, height: 14 }} />
            </View>
          </View>
        </PostCard>
      ))}
    </View>
  );
}
