import type { QueryClient } from '@tanstack/react-query';
import type { InferRequestType, InferResponseType } from 'hono/client';

import type { FeedData } from '@/lib/social';

import { api } from '@/lib/api';

export type ProfileUser = InferResponseType<typeof api.api.me.profile.$put, 200>['user'];

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

export function applyProfileToCache(client: QueryClient, user: ProfileUser) {
  client.setQueryData(['user', user.id], { user });
  client.setQueriesData<FeedData>({ queryKey: ['posts'] }, (data) => {
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
}
