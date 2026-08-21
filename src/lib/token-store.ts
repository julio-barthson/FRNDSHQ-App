import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** SecureStore keys allow alphanumerics, `.`, `-` and `_` only. */
const ACCESS_KEY = 'frndshq.access_token';
const REFRESH_KEY = 'frndshq.refresh_token';

/**
 * expo-secure-store has no web implementation. Phase 1 ships to iOS and
 * Android only, but the router still builds a web target, so fall back to
 * localStorage there purely to keep `expo start --web` working. It is NOT
 * secure storage — do not ship a web build treating it as such.
 */
const web = {
  get: (key: string) => Promise.resolve(globalThis.localStorage?.getItem(key) ?? null),
  set: (key: string, value: string) => {
    globalThis.localStorage?.setItem(key, value);
    return Promise.resolve();
  },
  remove: (key: string) => {
    globalThis.localStorage?.removeItem(key);
    return Promise.resolve();
  },
};

const native = {
  get: (key: string) => SecureStore.getItemAsync(key),
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  remove: (key: string) => SecureStore.deleteItemAsync(key),
};

const store = Platform.OS === 'web' ? web : native;

export const tokenStore = {
  getAccessToken: () => store.get(ACCESS_KEY),
  getRefreshToken: () => store.get(REFRESH_KEY),

  async save(accessToken: string, refreshToken: string) {
    // Written in parallel but awaited together: a half-written pair would
    // survive a crash and leave the next launch unable to refresh.
    await Promise.all([store.set(ACCESS_KEY, accessToken), store.set(REFRESH_KEY, refreshToken)]);
  },

  async clear() {
    await Promise.all([store.remove(ACCESS_KEY), store.remove(REFRESH_KEY)]);
  },
};
