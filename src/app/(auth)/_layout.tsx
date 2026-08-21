import { Stack } from 'expo-router';

import { Brand } from '@/constants/brand';

/**
 * The auth screens draw their own headings on ink, so the native header is off
 * and the scene background matches the splash to avoid a flash on hand-off.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Brand.ink },
      }}
    />
  );
}
