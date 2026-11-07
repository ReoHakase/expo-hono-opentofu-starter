import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { FeedData } from '@/lib/social';

import { feedOptions } from '@/lib/social';

import { Compose } from './compose';
import { Feed } from './feed';
import { ProfileEdit } from './profile-edit';
import { Text } from './ui/text';

jest.mock('@expo/ui', () => {
  const reactNative = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Host: reactNative.View,
    Column: reactNative.View,
    Row: reactNative.View,
    Spacer: reactNative.View,
    Text: reactNative.Text,
    Icon: Object.assign(() => null, { select: () => 'icon' }),
    TextInput: reactNative.TextInput,
    Button: ({
      label,
      children,
      onPress,
      disabled,
    }: {
      label?: string;
      children?: React.ReactNode;
      onPress: () => void;
      disabled: boolean;
    }) => (
      <reactNative.Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={onPress}
      >
        {label ? <reactNative.Text>{label}</reactNative.Text> : children}
      </reactNative.Pressable>
    ),
  };
});
jest.mock('@/components/native-host', () => ({
  NativeHost: jest.requireActual<typeof import('react-native')>('react-native').View,
}));
jest.mock('@/components/avatar', () => ({
  Avatar: ({ image }: { image?: string | null }) => {
    mockAvatarRenders.push(image ?? 'none');
    return null;
  },
}));
const mockAvatarRenders: string[] = [];
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useFocusEffect: () => {},
}));
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: () => {} }));
jest.mock('expo-router/stack', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Stack: {
      Toolbar: Object.assign(({ children }: { children: React.ReactNode }) => children, {
        Button: ({ children, ...props }: React.ComponentProps<typeof Pressable>) => (
          <Pressable {...props} accessibilityRole="button">
            <Text>{typeof children === 'string' ? children : null}</Text>
          </Pressable>
        ),
      }),
    },
  };
});
jest.mock('@/lib/profile-photo', () => ({
  pickProfilePhoto: () => mockPickPhoto(),
}));
jest.mock('@/theme/colors', () => ({
  useColors: () => ({ background: '#f2f2f7', card: '#fff', secondary: '#777', separator: '#ccc' }),
}));
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/preferences', () => ({
  usePreferences: () => ({ preferences: { haptics: false } }),
}));
jest.mock('@/lib/api', () => ({
  apiUrl: 'http://localhost:8080',
  authClient: {
    useSession: () => ({
      refetch: mockRefreshSession,
      isPending: mockSessionPending,
      data: mockLoggedIn
        ? {
            user: {
              id: 'viewer',
              name: 'はなこ',
              email: 'hanako@example.com',
              image: 'avatar-old',
            },
          }
        : null,
    }),
  },
  publicApi: { api: { posts: { $get: () => mockGetPublicPosts() } } },
  api: {
    api: {
      me: { profile: { $put: (input: unknown) => mockSaveProfile(input) } },
      posts: {
        $get: () => mockGetPosts(),
        $post: () => mockCreatePost(),
        ':id': { like: { $put: () => mockLike(), $delete: () => mockLike() } },
      },
    },
  },
}));
let mockLoggedIn = false;
let mockSessionPending = false;
const feedResponse = async () => ({
  ok: true,
  json: async () => ({
    items: [
      {
        id: 'one',
        body: 'こんにちは',
        createdAt: '2026-11-06T00:00:00Z',
        author: { id: 'author', name: 'たろう', image: 'avatar-one' },
        likeCount: 2,
        liked: false,
      },
      {
        id: 'two',
        body: '別の投稿',
        createdAt: '2026-11-06T00:00:00Z',
        author: { id: 'another', name: 'ゆい', image: 'avatar-two' },
        likeCount: 5,
        liked: false,
      },
    ],
    nextOffset: null,
  }),
});
const mockGetPosts = jest.fn(feedResponse);
const mockGetPublicPosts = jest.fn(feedResponse);
const mockRefreshSession = jest.fn(async () => {});
const mockPickPhoto = jest.fn<Promise<{ uri: string; base64: string } | null>, []>();
const mockSaveProfile = jest.fn((_input: unknown) =>
  Promise.resolve({
    status: 200,
    json: async () => ({ user: { id: 'viewer', name: '新しい名前', image: '/avatar-new' } }),
  }),
);
const mockLike = jest.fn(async () => ({ ok: true }));
const mockCreatePost = jest.fn(async () => ({ status: 201 }));

beforeEach(() => {
  // Advance FlatList's cell batching timer inside Testing Library's async queries.
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

function queryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
}

function wrapper(client = queryClient()) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

test('keeps the header across initial loading, failure, and retry without showing an empty feed', async () => {
  mockLoggedIn = false;
  const failed = Promise.withResolvers<Awaited<ReturnType<typeof mockGetPosts>>>();
  mockGetPublicPosts.mockReturnValueOnce(failed.promise);
  await render(<Feed header={<Text>プロフィール概要</Text>} />, { wrapper: wrapper() });
  expect(screen.getByRole('progressbar', { name: '投稿を読み込んでいます' })).toBeOnTheScreen();
  expect(screen.getByText('プロフィール概要')).toBeOnTheScreen();
  expect(screen.queryByText('まだ投稿がありません')).toBeNull();
  await act(() => {
    failed.reject(new Error('通信エラー'));
  });
  expect(await screen.findByText('投稿を読み込めませんでした')).toBeOnTheScreen();
  expect(screen.getByText('プロフィール概要')).toBeOnTheScreen();
  expect(screen.queryByText('まだ投稿がありません')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'もう一度試す' }));
  expect(await screen.findByText('こんにちは')).toBeOnTheScreen();
  expect(screen.getByText('プロフィール概要')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'いいね 2' }));
  expect(router.push).toHaveBeenCalledWith('/account');
});

test('waits for initial session hydration before fetching the signed-in feed', async () => {
  mockLoggedIn = false;
  mockSessionPending = true;
  const guestRequests = mockGetPublicPosts.mock.calls.length;
  const signedInRequests = mockGetPosts.mock.calls.length;
  try {
    const feed = await render(<Feed />, { wrapper: wrapper() });
    expect(screen.getByRole('progressbar', { name: '投稿を読み込んでいます' })).toBeOnTheScreen();
    expect(mockGetPublicPosts).toHaveBeenCalledTimes(guestRequests);
    expect(mockGetPosts).toHaveBeenCalledTimes(signedInRequests);

    mockSessionPending = false;
    mockLoggedIn = true;
    await feed.rerender(<Feed />);
    expect(await screen.findByText('こんにちは')).toBeOnTheScreen();
    expect(mockGetPosts).toHaveBeenCalledTimes(signedInRequests + 1);
    expect(mockGetPublicPosts).toHaveBeenCalledTimes(guestRequests);
  } finally {
    mockSessionPending = false;
  }
});

test.each([
  ['viewer', true],
  ['another', false],
] as const)(
  'shows a first-post action only on the signed-in author’s own empty profile (%s)',
  async (authorId, isOwnProfile) => {
    mockLoggedIn = true;
    mockGetPosts.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [], nextOffset: null }),
    });
    await render(<Feed authorId={authorId} header={<Text>プロフィール概要</Text>} />, {
      wrapper: wrapper(),
    });
    expect(await screen.findByText('まだ投稿がありません')).toBeOnTheScreen();
    expect(screen.getByText('プロフィール概要')).toBeOnTheScreen();
    const create = screen.queryByRole('button', { name: '最初の投稿を作成' });
    expect(Boolean(create)).toBe(isOwnProfile);
    jest.mocked(router.push).mockClear();
    if (create) {
      await fireEvent.press(create);
    }
    expect(jest.mocked(router.push).mock.calls).toEqual(isOwnProfile ? [['/compose']] : []);
  },
);

test('keeps a failed post draft and allows a successful retry before dismissing', async () => {
  mockLoggedIn = true;
  mockCreatePost.mockRejectedValueOnce(new Error('通信エラー'));
  await render(<Compose />, { wrapper: wrapper() });
  expect(screen.getByRole('button', { name: '投稿する' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('投稿の本文'), '今日のできごと');
  await fireEvent.press(screen.getByRole('button', { name: '投稿する' }));
  expect(await screen.findByText('通信エラー')).toBeOnTheScreen();
  expect(router.back).not.toHaveBeenCalled();
  expect(screen.getByText('7 / 500文字')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'もう一度試す' }));
  await waitFor(() => {
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});

test('optimistically updates only the liked row and cached profile without fetching the feed again', async () => {
  mockLoggedIn = true;
  const client = queryClient();
  await render(<Feed />, { wrapper: wrapper(client) });
  await screen.findByText('こんにちは');
  const homeKey = feedOptions('viewer').queryKey;
  const profileKey = feedOptions('viewer', 'author').queryKey;
  client.setQueryData<FeedData>(profileKey, client.getQueryData<FeedData>(homeKey));
  const otherRenders = mockAvatarRenders.filter((image) => image === 'avatar-two').length;
  const requests = mockGetPosts.mock.calls.length;
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  mockLike.mockImplementationOnce(async () => {
    await pending;
    return { ok: true };
  });
  await fireEvent.press(screen.getByRole('button', { name: 'いいね 2' }));
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'いいね済み 3' })).toBeDisabled();
  });
  expect(screen.getByRole('button', { name: 'いいね 5' })).toBeEnabled();
  expect(client.getQueryData<FeedData>(profileKey)?.pages[0]?.items[0]).toMatchObject({
    liked: true,
    likeCount: 3,
  });
  expect(screen.getByTestId('timeline')).toHaveProp('refreshing', false);
  await act(async () => {
    release?.();
    await pending;
  });
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'いいね済み 3' })).toBeEnabled();
  });
  expect(mockGetPosts.mock.calls.length).toBe(requests);
  expect(mockAvatarRenders.filter((image) => image === 'avatar-two')).toHaveLength(otherRenders);
});

test('rolls back a failed like without undoing a concurrent successful like on another post', async () => {
  mockLoggedIn = true;
  await render(<Feed />, { wrapper: wrapper() });
  await screen.findByText('こんにちは');
  let reject: ((error: Error) => void) | undefined;
  mockLike.mockImplementationOnce(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'いいね 2' }));
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'いいね済み 3' })).toBeDisabled();
  });
  await fireEvent.press(screen.getByRole('button', { name: 'いいね 5' }));
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'いいね済み 6' })).toBeEnabled();
  });
  await act(async () => {
    reject?.(new Error('通信エラー'));
  });
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'いいね 2' })).toBeEnabled();
  });
  expect(screen.getByRole('button', { name: 'いいね済み 6' })).toBeEnabled();
  expect(screen.getByText('通信エラー')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'もう一度試す' }));
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'いいね済み 3' })).toBeEnabled();
  });
});

test('opens the author object from a post avatar', async () => {
  mockLoggedIn = false;
  await render(<Feed />, { wrapper: wrapper() });
  await fireEvent.press(await screen.findByRole('button', { name: 'たろうのプロフィール' }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/users/[id]', params: { id: 'author' } });
});

test('retains the photo and name after a failed profile save and updates the matching cached author on retry', async () => {
  mockLoggedIn = true;
  jest.mocked(router.back).mockClear();
  const client = queryClient();
  const feed = await (await mockGetPosts()).json();
  const [first, other] = feed.items;
  if (!first || !other) {
    throw new Error('Missing fixture posts');
  }
  const key = feedOptions('viewer').queryKey;
  client.setQueryData(key, {
    pages: [
      {
        ...feed,
        items: [{ ...first, author: { id: 'viewer', name: 'はなこ', image: 'avatar-old' } }, other],
      },
    ],
    pageParams: [0],
  });

  await render(<ProfileEdit />, { wrapper: wrapper(client) });
  const saveButton = screen.getByLabelText('プロフィールを保存');
  expect(saveButton).toBeDisabled();
  mockPickPhoto.mockResolvedValueOnce(null);
  await fireEvent.press(screen.getByRole('button', { name: '写真を選ぶ' }));
  expect(saveButton).toBeDisabled();

  await fireEvent.changeText(screen.getByLabelText('表示名'), ' ');
  expect(saveButton).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('表示名'), '新しい名前');
  mockPickPhoto.mockResolvedValueOnce({ uri: 'file:///profile.jpg', base64: 'aGVsbG8=' });
  await fireEvent.press(screen.getByRole('button', { name: '写真を選ぶ' }));
  await waitFor(() => {
    expect(mockAvatarRenders.at(-1)).toBe('file:///profile.jpg');
  });
  mockSaveProfile.mockRejectedValueOnce(new Error('offline'));
  await fireEvent.press(saveButton);
  expect(
    await screen.findByText('通信に失敗しました 接続を確認して保存し直してください'),
  ).toBeOnTheScreen();
  expect(router.back).not.toHaveBeenCalled();
  expect(mockAvatarRenders.at(-1)).toBe('file:///profile.jpg');

  await fireEvent.press(saveButton);
  await waitFor(() => {
    expect(router.back).toHaveBeenCalledTimes(1);
  });
  expect(mockSaveProfile).toHaveBeenLastCalledWith({
    json: { name: '新しい名前', avatar: 'aGVsbG8=' },
  });
  expect(mockRefreshSession).toHaveBeenCalled();
  const items = client.getQueryData<FeedData>(key)?.pages[0]?.items;
  expect(items?.[0]?.author).toEqual({ id: 'viewer', name: '新しい名前', image: '/avatar-new' });
  expect(items?.[1]).toBe(other);
});
