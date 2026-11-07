import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { memo, useState } from 'react';
import { Appearance, Platform, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { useColors } from '@/theme/colors';
import { useStackOptions } from '@/theme/navigation';

// The RN preset replaces this subscription with a constant light scheme.
jest.unmock('react-native/Libraries/Utilities/useColorScheme');
jest.mock('expo-router', () => {
  const { Appearance: nativeAppearance } =
    jest.requireActual<typeof import('react-native')>('react-native');
  const surface = () => (nativeAppearance.getColorScheme() === 'dark' ? '#121212' : '#ffffff');
  const foreground = () => (nativeAppearance.getColorScheme() === 'dark' ? '#ffffff' : '#121212');
  return {
    Color: {
      ios: {},
      android: {
        dynamic: {
          get surface() {
            return surface();
          },
          get surfaceContainerLow() {
            return surface();
          },
          get onSurface() {
            return foreground();
          },
          get onSurfaceVariant() {
            return foreground();
          },
          get error() {
            return foreground();
          },
        },
      },
    },
  };
});

let scheme: 'light' | 'dark' = 'light';
const listeners = new Set<Parameters<typeof Appearance.addChangeListener>[0]>();

beforeEach(() => {
  scheme = 'light';
  jest
    .spyOn(Platform, 'select')
    .mockImplementation(
      (specifics) => specifics.android ?? ('default' in specifics ? specifics.default : undefined),
    );
  jest.spyOn(Appearance, 'getColorScheme').mockImplementation(() => scheme);
  jest.spyOn(Appearance, 'addChangeListener').mockImplementation((listener) => {
    listeners.add(listener);
    return {
      remove: () => {
        listeners.delete(listener);
      },
    };
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  listeners.clear();
});

const Card = memo(function Card() {
  const colors = useColors();
  const [draft, setDraft] = useState('');
  return (
    <View testID="card" style={{ backgroundColor: colors.card }}>
      <TextInput
        accessibilityLabel="本文"
        style={{ color: colors.text }}
        placeholderTextColor={colors.secondary}
        value={draft}
        onChangeText={setDraft}
      />
    </View>
  );
});

function Surface() {
  const options = useStackOptions();
  return (
    <View testID="stack" style={options.contentStyle}>
      <Screen>
        <Card />
      </Screen>
    </View>
  );
}

test('updates Android surfaces and memoized content on Appearance changes without losing a draft', async () => {
  await render(<Surface />);
  await fireEvent.changeText(screen.getByLabelText('本文'), '保存前の本文');
  expect(screen.getByTestId('card')).toHaveStyle({ backgroundColor: '#ffffff' });

  for (const next of ['dark', 'light'] as const) {
    await act(() => {
      scheme = next;
      for (const listener of listeners) {
        listener({ colorScheme: next });
      }
    });
    const background = next === 'dark' ? '#121212' : '#ffffff';
    const foreground = next === 'dark' ? '#ffffff' : '#121212';
    expect(screen.getByTestId('stack')).toHaveStyle({ backgroundColor: background });
    expect(screen.getByTestId('card')).toHaveStyle({ backgroundColor: background });
    expect(screen.getByLabelText('本文')).toHaveStyle({ color: foreground });
    expect(screen.getByLabelText('本文')).toHaveProp('placeholderTextColor', foreground);
    expect(screen.getByDisplayValue('保存前の本文')).toBeOnTheScreen();
  }
});
