import type { ReactElement } from 'react';

import { Icon } from '@expo/ui';
import { useInfiniteQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';

import { ContentError, ContentState } from '@/components/content-state';
import { FeedSkeleton } from '@/components/feed-skeleton';
import { Feedback } from '@/components/feedback';
import { NativeActionButton } from '@/components/native-action-button';
import { NativeHost } from '@/components/native-host';
import { PostRow } from '@/components/post-row';
import { SocialIcon } from '@/components/social-icon';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { apiUrl, authClient } from '@/lib/api';
import { feedOptions } from '@/lib/social';
import { useColors } from '@/theme/colors';

const feedError = '投稿を読み込めませんでした。通信状況を確認してお試しください。';

export function Feed({ authorId, header }: { authorId?: string; header?: ReactElement }) {
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);
  const [displayTime, setDisplayTime] = useState(Date.now);
  useFocusEffect(
    useCallback(() => {
      setDisplayTime(Date.now());
    }, []),
  );
  const session = authClient.useSession();
  const viewerId = session.data?.user.id;
  const canFetch = Boolean(apiUrl && (viewerId !== undefined || !session.isPending));
  const feed = useInfiniteQuery({
    ...feedOptions(viewerId, authorId),
    enabled: canFetch,
  });
  const items = useMemo(() => feed.data?.pages.flatMap((page) => page.items) ?? [], [feed.data]);
  const isOwnProfile = Boolean(authorId && viewerId === authorId);
  function retry() {
    void feed.refetch();
  }

  function emptyState() {
    if (!apiUrl) {
      return (
        <ContentState
          icon={Icon.select({
            ios: 'network',
            android: import('@expo/material-symbols/language.xml'),
          })}
          title="接続先が未設定です"
          description="セットアップ後にタイムラインを利用できます。"
        />
      );
    }
    if (feed.isPending) {
      return <FeedSkeleton />;
    }
    if (feed.isError) {
      return <ContentError title="投稿を読み込めませんでした" onRetry={retry} />;
    }
    return (
      <ContentState
        icon={Icon.select({
          ios: 'text.bubble',
          android: import('@expo/material-symbols/chat_bubble.xml'),
        })}
        title="まだ投稿がありません"
        description={
          authorId
            ? isOwnProfile
              ? '投稿するとここに表示されます。'
              : '投稿が公開されると表示されます。'
            : '公開された投稿がここに表示されます。'
        }
      >
        {isOwnProfile ? (
          <NativeHost matchContents style={{ maxWidth: '100%' }}>
            <NativeActionButton
              icon={Icon.select({
                ios: 'square.and.pencil',
                android: import('@expo/material-symbols/edit_square.xml'),
              })}
              label="最初の投稿を作成"
              onPress={() => {
                router.push('/compose');
              }}
            />
          </NativeHost>
        ) : null}
      </ContentState>
    );
  }
  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingTop: header ? 0 : 8, paddingBottom: 24 }}
      data={items}
      keyExtractor={(item) => item.id}
      testID="timeline"
      refreshing={refreshing}
      onRefresh={
        canFetch
          ? () => {
              setDisplayTime(Date.now());
              setRefreshing(true);
              void feed.refetch().then(
                () => {
                  setRefreshing(false);
                },
                () => {
                  setRefreshing(false);
                },
              );
            }
          : undefined
      }
      ListHeaderComponent={
        <>
          {header}
          {feed.isError && items.length > 0 ? (
            <View style={{ paddingHorizontal: 20 }}>
              <Feedback message={feedError} onRetry={retry} />
            </View>
          ) : null}
        </>
      }
      ListEmptyComponent={
        <View style={!header && !(apiUrl && feed.isPending) ? { paddingTop: 32 } : undefined}>
          {emptyState()}
        </View>
      }
      renderItem={({ item }) => <PostRow item={item} viewerId={viewerId} now={displayTime} />}
      ListFooterComponent={
        feed.hasNextPage ? (
          <Button
            variant="ghost"
            className="m-4"
            disabled={feed.isFetchingNextPage}
            onPress={() => {
              void feed.fetchNextPage();
            }}
          >
            {!feed.isFetchingNextPage ? (
              <SocialIcon
                name={Icon.select({
                  ios: 'chevron.down',
                  android: import('@expo/material-symbols/keyboard_arrow_down.xml'),
                })}
                color={colors.secondary}
              />
            ) : null}
            <Text>{feed.isFetchingNextPage ? '読み込み中…' : 'もっと見る'}</Text>
          </Button>
        ) : undefined
      }
    />
  );
}
