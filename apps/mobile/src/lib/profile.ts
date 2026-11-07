import type { QueryClient } from '@tanstack/react-query';
import type { InferRequestType, InferResponseType } from 'hono/client';

import { queryOptions, skipToken } from '@tanstack/react-query';

import type { FeedData } from '@/lib/social';

import { api, apiUrl, publicApi } from '@/lib/api';
import { feedKey } from '@/lib/social';

export type ProfileUser = InferResponseType<typeof api.api.me.profile.$put, 200>['user'];

export function profileOptions(id?: string) {
  return queryOptions({
    queryKey: ['user', id],
    queryFn:
      id && apiUrl
        ? async ({ signal }) => {
            const response = await publicApi.api.users[':id'].$get(
              { param: { id } },
              { init: { signal } },
            );
            if (response.status !== 200) {
              throw new Error('プロフィールを読み込めませんでした。');
            }
            return await response.json();
          }
        : skipToken,
  });
}

export async function saveProfile(input: InferRequestType<typeof api.api.me.profile.$put>['json']) {
  const response = await api.api.me.profile.$put({ json: input }).catch(() => {
    throw new Error('通信に失敗しました 接続を確認して保存し直してください');
  });
  if (response.status !== 200) {
    throw new Error(
      response.status === 401
        ? 'ログインし直してください'
        : '変更を保存できませんでした もう一度お試しください',
    );
  }
  return (await response.json()).user;
}

export async function applyProfileToCache(client: QueryClient, user: ProfileUser) {
  const { queryKey } = profileOptions(user.id);
  await Promise.all([
    client.cancelQueries({ queryKey: feedKey }),
    client.cancelQueries({ queryKey, exact: true }),
  ]);
  client.setQueryData(queryKey, { user });
  client.setQueriesData<FeedData>({ queryKey: feedKey }, (data) => {
    if (!data) {
      return data;
    }
    const pages = data.pages.map((page) => {
      let changed = false;
      const items = page.items.map((item) => {
        if (
          item.author.id !== user.id ||
          (item.author.name === user.name && item.author.image === user.image)
        ) {
          return item;
        }
        changed = true;
        return { ...item, author: user };
      });
      return changed ? { ...page, items } : page;
    });
    return pages.every((page, index) => page === data.pages[index]) ? data : { ...data, pages };
  });
  // A cancelled first load has no cached posts to update. Restart it for mounted feeds.
  void client.refetchQueries({
    queryKey: feedKey,
    type: 'active',
    predicate: (query) => query.state.status === 'pending',
  });
}
