import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** The NestJS server listens on 8000 and mounts everything under /api. */
const API_PORT = 8000;

/**
 * The Android emulator's alias for the host machine. Inside the emulator
 * `localhost` is the emulator itself, so a dev server reported as `localhost`
 * has to be rewritten or every request lands nowhere.
 */
const ANDROID_EMULATOR_HOST = '10.0.2.2';

function hostFor(host: string): string {
  const isLoopback = host === 'localhost' || host === '127.0.0.1';
  if (isLoopback && Platform.OS === 'android') return ANDROID_EMULATOR_HOST;
  return host;
}

/**
 * A physical device cannot reach the dev machine on `localhost`, so in
 * development we borrow the address Expo is already serving the bundle from.
 * `hostUri` looks like `192.168.1.20:8081` on a device, but plain
 * `localhost:8081` on an emulator using adb port forwarding — which is why the
 * host goes through {@link hostFor} rather than being used as-is.
 */
function devHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;

  const host = hostUri.split(':')[0];
  if (!host) return null;

  return `http://${hostFor(host)}:${API_PORT}`;
}

/**
 * Set `EXPO_PUBLIC_API_URL` in `.env` to point at a deployed backend. It is
 * inlined at build time, so a production build must have it set — the dev
 * fallback below only ever resolves while the Expo dev server is running.
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? devHost() ?? `http://${hostFor('localhost')}:${API_PORT}`;

export const API_BASE = `${API_URL}/api`;

/**
 * Google issues a separate OAuth client per platform, and the one that starts
 * the flow decides the `aud` claim on the resulting ID token. All three are
 * listed here; the backend accepts any of them as an audience.
 *
 * The Android client is bound to the app's package name *and* the SHA-1 of the
 * signing certificate, so the debug keystore needs its own client id or
 * sign-in fails on a development build.
 */
export const GOOGLE_CLIENT_IDS = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
} as const;

/** False when no client id is configured, so the button can be hidden. */
export const GOOGLE_SIGN_IN_ENABLED = Object.values(GOOGLE_CLIENT_IDS).some(Boolean);
