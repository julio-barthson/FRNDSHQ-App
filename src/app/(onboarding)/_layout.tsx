import { Stack } from 'expo-router';

import { Brand } from '@/constants/brand';

/**
 * Setup, after the email is confirmed and before the catalogue exists. Its own
 * group so the root navigator can gate it on `onboarding` alone — neither
 * signup path creates a profile, and until this finishes the account has no
 * artist or label row for a release to belong to.
 */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Brand.ink },
      }}
    />
  );
}
