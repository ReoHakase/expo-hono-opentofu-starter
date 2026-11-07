import type { ReactNode } from 'react';

import { Icon } from '@expo/ui';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ContentError, ContentState } from '@/components/content-state';
import { Feed } from '@/components/feed';
import { FeedSkeleton } from '@/components/feed-skeleton';
import { Feedback } from '@/components/feedback';
import { NativeActionButton } from '@/components/native-action-button';
import { NativeHost } from '@/components/native-host';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { Text } from '@/components/ui/text';
import { apiUrl, authClient, publicApi } from '@/lib/api';
import { useColors } from '@/theme/colors';
import { avatarSize } from '@/theme/metrics';

function ProfileCard({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <View
      style={{
        marginHorizontal: 20,
        padding: 24,
        borderRadius: 20,
        backgroundColor: colors.card,
        gap: 16,
        alignItems: 'center',
      }}
    >
      {children}
    </View>
  );
}

export function Profile({ id }: { id?: string }) {
  const colors = useColors();
  const { fontScale } = useWindowDimensions();
  const {
    data: session,
    error: sessionError,
    isPending,
    refetch: refetchSession,
  } = authClient.useSession();
  const profile = useQuery({
    queryKey: ['user', id],
    enabled: Boolean(id && apiUrl),
    queryFn: async ({ signal }) => {
      const response = await publicApi.api.users[':id'].$get(
        { param: { id: id ?? '' } },
        { init: { signal } },
      );
      if (response.status !== 200) {
        throw new Error('プロフィールを読み込めませんでした。');
      }
      return await response.json();
    },
  });
  if (id && !apiUrl) {
    return <Feedback fullScreen message="接続先が未設定です。" />;
  }
  if (id ? profile.isPending : isPending && !session) {
    return (
      <Screen contentContainerStyle={{ paddingHorizontal: 0 }}>
        <FeedSkeleton
          label="プロフィールを読み込んでいます"
          header={
            <View style={{ paddingBottom: 24 }}>
              <ProfileCard>
                <Skeleton
                  style={{
                    width: avatarSize * 2,
                    height: avatarSize * 2,
                    borderRadius: avatarSize,
                  }}
                />
                <Skeleton style={{ width: '45%', height: 24 * fontScale }} />
                {!id ? <Skeleton style={{ width: '100%', height: 44 }} /> : null}
              </ProfileCard>
            </View>
          }
        />
      </Screen>
    );
  }
  if (id ? profile.isError && !profile.data : sessionError && !session) {
    return (
      <Screen>
        <ContentError
          title={id ? 'プロフィールを読み込めませんでした' : 'アカウントを確認できませんでした'}
          onRetry={() => {
            void (id ? profile.refetch() : refetchSession());
          }}
        />
      </Screen>
    );
  }
  const person = id ? profile.data?.user : session?.user;
  if (!person) {
    return (
      <Screen>
        <ContentState
          icon={Icon.select({
            ios: 'person.crop.circle',
            android: import('@expo/material-symbols/account_circle.xml'),
          })}
          title="マイページを表示"
          description="自分の投稿を確認するにはログインしてください"
        >
          <NativeHost matchContents style={{ maxWidth: '100%' }}>
            <NativeActionButton
              label="ログイン"
              icon={Icon.select({
                ios: 'rectangle.portrait.and.arrow.right',
                android: import('@expo/material-symbols/login.xml'),
              })}
              onPress={() => {
                router.push('/account');
              }}
            />
          </NativeHost>
        </ContentState>
      </Screen>
    );
  }
  return (
    <Feed
      authorId={person.id}
      header={
        <View style={{ paddingTop: 20, backgroundColor: colors.background }}>
          <ProfileCard>
            <Avatar size={avatarSize * 2} image={person.image} />
            <Text variant="h3" className="text-center font-bold">
              {person.name}
            </Text>
            {session?.user.id === person.id ? (
              <NativeHost matchContents={{ vertical: true }} style={{ alignSelf: 'stretch' }}>
                <NativeActionButton
                  label="プロフィールを編集"
                  icon={Icon.select({
                    ios: 'pencil',
                    android: import('@expo/material-symbols/edit.xml'),
                  })}
                  variant="outlined"
                  fullWidth
                  onPress={() => {
                    router.push('/profile-edit');
                  }}
                />
              </NativeHost>
            ) : null}
          </ProfileCard>
          <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 12 }}>
            <Text accessibilityRole="header" className="font-semibold text-muted-foreground">
              投稿
            </Text>
          </View>
        </View>
      }
    />
  );
}
