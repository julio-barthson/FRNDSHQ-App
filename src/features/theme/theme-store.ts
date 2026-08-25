import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { ThemePreference } from '@/features/theme/theme';

/** SecureStore keys allow alphanumerics, `.`, `-` and `_` only. */
const KEY = 'frndshq.theme';

const VALID: ThemePreference[] = ['system', 'light', 'dark'];

/**
 * Where the theme choice lives.
 *
 * SecureStore, which is overkill for a preference that is not a secret — but
 * it is already a dependency, and `@react-native-async-storage/async-storage`
 * would be a new native module, which means a rebuild. Not worth it for one
 * string. Web falls back to localStorage so `expo start --web` keeps working.
 */
const web = {
  get: () => Promise.resolve(globalThis.localStorage?.getItem(KEY) ?? null),
  set: (value: string) => {
    globalThis.localStorage?.setItem(KEY, value);
    return Promise.resolve();
  },
};

const native = {
  get: () => SecureStore.getItemAsync(KEY),
  set: (value: string) => SecureStore.setItemAsync(KEY, value),
};

const storage = Platform.OS === 'web' ? web : native;

export const themeStore = {
  /** Null when nothing has been chosen, or when the stored value is junk. */
  async get(): Promise<ThemePreference | null> {
    try {
      const stored = await storage.get();
      return stored && VALID.includes(stored as ThemePreference)
        ? (stored as ThemePreference)
        : null;
    } catch {
      // A device that will not read its own storage should still open the app.
      return null;
    }
  },

  async set(preference: ThemePreference): Promise<void> {
    try {
      await storage.set(preference);
    } catch {
      // The choice applies for this session either way.
    }
  },
};
