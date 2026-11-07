import { Column, Icon, Row, Spacer, Text as NativeText, TextInput } from '@expo/ui';
import { profileInputSchema } from '@starter/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { Stack } from 'expo-router/stack';
import { useEffect, useState } from 'react';
import { Alert, Platform, View, useWindowDimensions } from 'react-native';

import type { ProfileUser } from '@/lib/profile';
import type { ProfilePhoto } from '@/lib/profile-photo';

import { Avatar } from '@/components/avatar';
import { Feedback } from '@/components/feedback';
import { NativeActionButton } from '@/components/native-action-button';
import { NativeHost } from '@/components/native-host';
import { Screen } from '@/components/screen';
import { authClient } from '@/lib/api';
import { applyProfileToCache, saveProfile } from '@/lib/profile';
import { pickProfilePhoto } from '@/lib/profile-photo';
import { useColors } from '@/theme/colors';
import { avatarSize } from '@/theme/metrics';

function Cancel({ disabled = false }: { disabled?: boolean }) {
  if (Platform.OS === 'android') {
    return null;
  }
  return (
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Button
        accessibilityLabel="キャンセル"
        icon={Icon.select({ ios: 'xmark', android: import('@expo/material-symbols/close.xml') })}
        disabled={disabled}
        onPress={() => {
          router.back();
        }}
      >
        キャンセル
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}

function Editor({
  user,
  refreshSession,
}: {
  user: ProfileUser;
  refreshSession: () => Promise<void>;
}) {
  const colors = useColors();
  const { fontScale } = useWindowDimensions();
  const PhotoActions = fontScale >= 1.4 ? Column : Row;
  const client = useQueryClient();
  const [name, setName] = useState(user.name);
  const [photo, setPhoto] = useState<ProfilePhoto | null>();
  const [choosing, setChoosing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [photoError, setPhotoError] = useState<string>();
  const validation = profileInputSchema.safeParse({ name });
  const dirty = name.trim() !== user.name || photo !== undefined;
  const save = useMutation({
    mutationFn: () =>
      saveProfile({
        ...profileInputSchema.parse({ name }),
        ...(photo !== undefined ? { avatar: photo?.base64 ?? null } : {}),
      }),
    onSuccess: async (person) => {
      await applyProfileToCache(client, person);
      await refreshSession();
    },
  });
  useEffect(() => {
    if (save.isSuccess) {
      router.back();
    }
  }, [save.isSuccess]);
  usePreventRemove((dirty || save.isPending) && !save.isSuccess && !discarding, ({ repeat }) => {
    if (save.isPending) {
      return;
    }
    Alert.alert('変更を破棄しますか', undefined, [
      { text: '編集を続ける', style: 'cancel' },
      {
        text: '破棄する',
        style: 'destructive',
        onPress: () => {
          setDiscarding(true);
          repeat();
        },
      },
    ]);
  });

  async function choosePhoto() {
    setChoosing(true);
    setPhotoError(undefined);
    try {
      const selected = await pickProfilePhoto();
      if (selected) {
        setPhoto(selected);
      }
    } catch {
      setPhotoError('写真を選べませんでした 別の写真でお試しください');
    } finally {
      setChoosing(false);
    }
  }

  const image = photo === undefined ? user.image : photo?.uri;
  const busy = save.isPending || choosing;
  const canSave = !busy && dirty && validation.success;
  return (
    <>
      <Cancel disabled={busy} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="プロフィールを保存"
          disabled={!canSave}
          variant="done"
          icon={Icon.select({
            ios: 'checkmark',
            android: import('@expo/material-symbols/check.xml'),
          })}
          {...(Platform.OS === 'android' && !canSave ? { tintColor: colors.secondary } : {})}
          onPress={() => {
            save.mutate();
          }}
        >
          {save.isPending ? '保存中' : '保存'}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Screen>
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 12 }}>
          <Avatar size={avatarSize * 2} image={image} />
          <NativeHost matchContents={{ vertical: true }} style={{ alignSelf: 'stretch' }}>
            <Column alignment="center" style={{ width: '100%' }}>
              <PhotoActions spacing={8}>
                <NativeActionButton
                  icon={Icon.select({
                    ios: 'photo.on.rectangle',
                    android: import('@expo/material-symbols/photo_library.xml'),
                  })}
                  label={choosing ? '写真を準備中' : '写真を選ぶ'}
                  variant="text"
                  disabled={busy}
                  onPress={() => {
                    void choosePhoto();
                  }}
                />
                {image ? (
                  <NativeActionButton
                    icon={Icon.select({
                      ios: 'trash',
                      android: import('@expo/material-symbols/delete.xml'),
                    })}
                    label="写真を削除"
                    variant="text"
                    disabled={busy}
                    onPress={() => {
                      setPhoto(user.image ? null : undefined);
                      setPhotoError(undefined);
                    }}
                  />
                ) : null}
              </PhotoActions>
            </Column>
          </NativeHost>
        </View>
        <NativeHost matchContents={{ vertical: true }}>
          <Column spacing={8}>
            <Row style={{ width: '100%' }}>
              <NativeText>表示名</NativeText>
              <Spacer flexible />
              <NativeText style={{ opacity: 0.6 }}>{`${name.length}/40`}</NativeText>
            </Row>
            <TextInput
              accessibilityLabel="表示名"
              testID="profile-name"
              defaultValue={user.name}
              placeholder="名前を入力"
              onChangeText={setName}
              editable={!busy}
              maxLength={40}
              autoComplete="name"
              autoCorrect={false}
              returnKeyType="done"
              style={{ width: '100%', padding: 16, backgroundColor: colors.card, borderRadius: 12 }}
            />
          </Column>
        </NativeHost>
        {!validation.success ? (
          <Feedback message={validation.error.issues[0]?.message ?? '名前を確認してください'} />
        ) : null}
        {photoError || save.error ? (
          <Feedback message={photoError ?? save.error?.message ?? ''} />
        ) : null}
      </Screen>
    </>
  );
}

export function ProfileEdit() {
  const session = authClient.useSession();
  if (!session.data) {
    return (
      <>
        <Cancel />
        {session.isPending || session.error ? (
          <Feedback
            fullScreen
            loading={session.isPending}
            message={session.isPending ? '読み込み中' : 'プロフィールを読み込めませんでした'}
            {...(session.error
              ? {
                  onRetry: () => {
                    void session.refetch();
                  },
                }
              : {})}
          />
        ) : (
          <Screen>
            <Feedback message="ログインしてください" />
            <NativeHost matchContents={{ vertical: true }}>
              <NativeActionButton
                icon={Icon.select({
                  ios: 'rectangle.portrait.and.arrow.right',
                  android: import('@expo/material-symbols/login.xml'),
                })}
                label="ログイン"
                onPress={() => {
                  router.replace('/account');
                }}
              />
            </NativeHost>
          </Screen>
        )}
      </>
    );
  }
  return (
    <Editor
      user={{
        id: session.data.user.id,
        name: session.data.user.name,
        image: session.data.user.image ?? null,
      }}
      refreshSession={async () => {
        await session.refetch();
      }}
    />
  );
}
