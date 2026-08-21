import { Stack } from 'expo-router';

import { Brand } from '@/constants/brand';

/**
 * The one screen an account can reach before its email is confirmed. It is a
 * group of its own so the root navigator can gate it on `unverified` alone —
 * an unverified user must not be able to walk back to sign-in and stall there.
 */
export default function VerifyLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Brand.ink },
      }}
    />
  );
}
