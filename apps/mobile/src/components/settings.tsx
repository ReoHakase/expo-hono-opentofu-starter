import { Column, FieldGroup, Icon, ListItem, Picker, Switch, Text as NativeText } from '@expo/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';

import { NativeActionButton } from '@/components/native-action-button';
import { NativeHost } from '@/components/native-host';
import { authClient } from '@/lib/api';
import { addPasskey, passkeysAvailable } from '@/lib/passkeys';
import { usePreferences } from '@/lib/preferences';
import { useColors } from '@/theme/colors';
import { iconSize } from '@/theme/metrics';

export function Settings() {
  const colors = useColors();
  const { preferences, update, storageError } = usePreferences();
  const session = authClient.useSession();
  const client = useQueryClient();
  const keys = useQuery({
    queryKey: ['passkeys', session.data?.user.id],
    enabled: Boolean(session.data),
    queryFn: async () => {
      const result = await authClient.passkey.listUserPasskeys();
      if (result.error) {
        throw new Error('パスキーを読み込めませんでした。');
      }
      return result.data;
    },
  });
  const action = useMutation({
    mutationFn: async (
      value: { kind: 'add' } | { kind: 'logout' } | { kind: 'delete'; id: string },
    ) => {
      if (value.kind === 'add') {
        await addPasskey();
        return;
      }
      const result =
        value.kind === 'logout'
          ? await authClient.signOut()
          : await authClient.passkey.deletePasskey({ id: value.id });
      if (result.error) {
        throw new Error('操作を完了できませんでした。もう一度お試しください。');
      }
    },
    onSuccess: async (_data, value) => {
      if (value.kind === 'logout') {
        client.clear();
        router.replace('/');
      } else {
        await client.invalidateQueries({ queryKey: ['passkeys'] });
      }
    },
  });
  return (
    <View style={{ flex: 1 }}>
      <NativeHost style={{ flex: 1 }}>
        <FieldGroup>
          {storageError || action.error || session.error ? (
            <FieldGroup.Section title="操作を完了できませんでした">
              <NativeText>
                {storageError ?? action.error?.message ?? 'アカウントを確認できませんでした'}
              </NativeText>
              {session.error ? (
                <NativeActionButton
                  icon={Icon.select({
                    ios: 'arrow.clockwise',
                    android: import('@expo/material-symbols/refresh.xml'),
                  })}
                  label="もう一度試す"
                  variant="outlined"
                  onPress={() => {
                    void session.refetch();
                  }}
                />
              ) : null}
            </FieldGroup.Section>
          ) : null}
          <FieldGroup.Section title="表示と操作">
            <ListItem
              leading=<Icon
                name={Icon.select({
                  ios: 'circle.lefthalf.filled',
                  android: import('@expo/material-symbols/dark_mode.xml'),
                })}
                size={iconSize}
              />
            >
              <NativeText>外観</NativeText>
              <ListItem.Trailing>
                <Picker
                  selectedValue={preferences.appearance}
                  onValueChange={(appearance) => {
                    update({ appearance });
                  }}
                  testID="appearance-picker"
                >
                  <Picker.Item label="端末に合わせる" value="system" />
                  <Picker.Item label="ライト" value="light" />
                  <Picker.Item label="ダーク" value="dark" />
                </Picker>
              </ListItem.Trailing>
            </ListItem>
            <Switch
              label="操作時の振動"
              value={preferences.haptics}
              onValueChange={(haptics) => {
                update({ haptics });
              }}
            />
          </FieldGroup.Section>
          <FieldGroup.Section title="アカウント">
            {session.data ? (
              <>
                <Column spacing={4} style={{ paddingVertical: 8 }}>
                  <NativeText textStyle={{ fontWeight: '600' }}>
                    {session.data.user.name}
                  </NativeText>
                  <NativeText style={{ opacity: 0.6 }}>{session.data.user.email}</NativeText>
                </Column>
                <ListItem
                  onPress={() => {
                    router.push('/profile-edit');
                  }}
                  leading=<Icon
                    name={Icon.select({
                      ios: 'person.crop.circle',
                      android: import('@expo/material-symbols/account_circle.xml'),
                    })}
                    size={iconSize}
                  />
                  trailing=<Icon
                    name={Icon.select({
                      ios: 'chevron.right',
                      android: import('@expo/material-symbols/chevron_right.xml'),
                    })}
                    size={16}
                    color={colors.secondary}
                  />
                >
                  <NativeText>プロフィールを編集</NativeText>
                </ListItem>
              </>
            ) : (
              <NativeActionButton
                icon={Icon.select({
                  ios: 'rectangle.portrait.and.arrow.right',
                  android: import('@expo/material-symbols/login.xml'),
                })}
                label={session.isPending ? '確認中…' : 'ログイン・新規登録'}
                disabled={session.isPending}
                onPress={() => {
                  router.push('/account');
                }}
              />
            )}
          </FieldGroup.Section>
          {session.data ? (
            <FieldGroup.Section>
              <NativeActionButton
                label="ログアウト"
                icon={Icon.select({
                  ios: 'rectangle.portrait.and.arrow.right',
                  android: import('@expo/material-symbols/logout.xml'),
                })}
                variant="outlined"
                disabled={action.isPending}
                onPress={() => {
                  action.mutate({ kind: 'logout' });
                }}
              />
            </FieldGroup.Section>
          ) : null}
          {session.data ? (
            <FieldGroup.Section title="パスキー">
              <FieldGroup.SectionFooter>
                <NativeText>指紋・顔認証や端末のロックでログインできます。</NativeText>
              </FieldGroup.SectionFooter>
              {keys.isPending ? <NativeText>読み込み中…</NativeText> : null}
              {keys.error ? (
                <NativeActionButton
                  icon={Icon.select({
                    ios: 'arrow.clockwise',
                    android: import('@expo/material-symbols/refresh.xml'),
                  })}
                  label="読み込めませんでした。再試行"
                  variant="outlined"
                  onPress={() => {
                    void keys.refetch();
                  }}
                />
              ) : null}
              {keys.data?.length === 0 ? (
                <NativeText>登録済みのパスキーはありません</NativeText>
              ) : null}
              {keys.data?.map((key) => (
                <ListItem key={key.id}>
                  <NativeText>{key.name ?? 'パスキー'}</NativeText>
                  <ListItem.Trailing>
                    <NativeActionButton
                      icon={Icon.select({
                        ios: 'trash',
                        android: import('@expo/material-symbols/delete.xml'),
                      })}
                      label="削除"
                      variant="outlined"
                      disabled={action.isPending}
                      onPress={() => {
                        action.mutate({ kind: 'delete', id: key.id });
                      }}
                    />
                  </ListItem.Trailing>
                </ListItem>
              ))}
              <NativeActionButton
                icon={Icon.select({
                  ios: 'plus',
                  android: import('@expo/material-symbols/add.xml'),
                })}
                label="この端末のパスキーを追加"
                disabled={action.isPending || !passkeysAvailable}
                onPress={() => {
                  action.mutate({ kind: 'add' });
                }}
              />
              {!passkeysAvailable ? <NativeText>この環境では登録できません。</NativeText> : null}
            </FieldGroup.Section>
          ) : null}
          <FieldGroup.Section title="このアプリについて">
            <NativeText>expo-hono-opentofu-starter</NativeText>
            <NativeText>日本語SNSのサンプル · 0.1.0</NativeText>
            <FieldGroup.SectionFooter>
              <NativeText>
                投稿といいねは接続先のサーバーに保存され、公開されます。表示設定はこの端末だけに保存されます。
              </NativeText>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>
        </FieldGroup>
      </NativeHost>
    </View>
  );
}
