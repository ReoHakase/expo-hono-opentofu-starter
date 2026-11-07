# Mobile

Follow the root AGENTS.md. Expo SDK 58 and React Native 0.88 are pinned in the lockfile.

- iOS UX is the priority; **every feature must work on Android**. Use universal Expo UI and Native Tabs/Stack with SF Symbols and Material icons.
- Fetch SDK 58 docs and inspect installed types before using Expo APIs. `src/app` is routes-only.
- Use `bunx expo install` for native dependencies. Do not hand-edit generated `ios/` or `android/` folders.
- `bun run typecheck`, `bun run test`, `bun run doctor`, `bun run export` run here. Root `bun run lint` owns lint configuration.
- Use a Development Build with host Device Hub and Compose Metro for everyday Simulator/Emulator development and Fast Refresh. Use `development-simulator` for iOS Simulator and `development` for Android. Expo Go remains an optional initial smoke test; standalone preview builds do not connect to Metro.
- Use [the UI state and icon rules](../../docs/ui.md) for native screens. Check layout, meaningful symbols, a screen reader label for icon-only actions, and large text on each OS. The Maestro selector alone does not verify spacing. Open the captured screen before completing the check.
- Never put a secret in `EXPO_PUBLIC_*`. See ../../docs/setup.md for device networking and EAS setup.
