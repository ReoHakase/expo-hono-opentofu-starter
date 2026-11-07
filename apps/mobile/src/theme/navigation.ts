import { useColors } from './colors';

// Apply the same OS-owned surface to the root stack and every tab stack.
export function useStackOptions() {
  const colors = useColors();
  return {
    headerBackTitle: '戻る',
    contentStyle: { backgroundColor: colors.background },
  };
}
