import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glow } from '@/components/ui/illustrations';
import { SettingsLink, SettingsSection } from '@/components/ui/settings-row';
import { useTheme, type ThemePreference } from '@/features/theme/theme';
import { useSession } from '@/features/auth/session';
import { API_BASE, GOOGLE_SIGN_IN_ENABLED } from '@/lib/env';

/** The legal links moved to Settings › About, which is where a store looks. */
const APPEARANCE_LABEL: Record<ThemePreference, string> = {
  system: 'Device',
  light: 'Light',
  dark: 'Dark',
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useSession();
  const { preference } = useTheme();

  const version = Constants.expoConfig?.version ?? '1.0.0';

  // Exactly one of these is set once onboarding has chosen.
  const displayName = user?.artist?.stageName ?? user?.label?.name ?? null;
  const avatarUrl = user?.artist?.avatarUrl ?? user?.label?.logoUrl ?? user?.image ?? null;
  const isLabel = user?.label != null;
  const bio = user?.artist?.bio ?? null;

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You can sign back in at any time.', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
    <View className="bg-ink flex-1" style={{ paddingTop: insets.top }}>
      <ScrollView
        contentContainerClassName="gap-6 px-4 pt-4 pb-16"
        showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(340)} className="items-center gap-3 pt-4">
          <View className="h-[104px] w-[104px] items-center justify-center">
            <View pointerEvents="none" className="absolute h-[150px] w-[150px]">
              <Glow />
            </View>

            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: 96, height: 96, borderRadius: 48 }}
                contentFit="cover"
              />
            ) : (
              <View className="border-blue-line bg-blue-surface h-[96px] w-[96px] items-center justify-center rounded-full border">
                <Text className="font-outfit-bold text-display text-blue-ink">
                  {(displayName ?? user?.email ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View className="items-center gap-2">
            <Text className="font-outfit-bold text-title text-fg text-center">
              {displayName ?? 'Your profile'}
            </Text>

            <View className="border-blue-line bg-blue-surface rounded-full border px-3 py-[3px]">
              <Text className="font-outfit-medium text-caption text-blue-ink">
                {isLabel ? 'Label' : 'Artist'}
              </Text>
            </View>

            {bio ? (
              <Text className="font-outfit text-callout text-muted px-4 text-center">{bio}</Text>
            ) : null}
          </View>

          <Pressable
            onPress={() => router.push('/edit-profile')}
            accessibilityRole="button"
            className="rounded-button border-line active:bg-ink-raised min-h-[44px] items-center justify-center border px-6 py-3">
            <Text className="font-outfit-semibold text-callout text-fg">Edit profile</Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(340)}>
          <SettingsSection title="Account">
            <SettingsLink
              icon="person-circle-outline"
              label="Profile"
              value="Name, photo, details"
              onPress={() => router.push('/edit-profile')}
              first
            />
            <SettingsLink
              icon="mail-outline"
              label="Email"
              value={user?.emailVerified ? user?.email : 'Not verified'}
              onPress={() => router.push('/edit-profile')}
            />
          </SettingsSection>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(340)}>
          <SettingsSection title="Preferences">
            <SettingsLink
              icon="notifications-outline"
              label="Notifications"
              onPress={() => router.push('/settings/notifications')}
              first
            />
            <SettingsLink
              icon="color-palette-outline"
              label="Appearance"
              value={APPEARANCE_LABEL[preference]}
              onPress={() => router.push('/settings/appearance')}
            />
          </SettingsSection>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(340)}>
          <SettingsSection title="Support">
            <SettingsLink
              icon="information-circle-outline"
              label="About"
              value={`Version ${version}`}
              onPress={() => router.push('/settings/about')}
              first
            />
          </SettingsSection>
        </Animated.View>

        {/* Kept from the session smoke test. Which host the app resolved is the
            single most useful thing to see when requests start failing, and it
            is invisible everywhere else. Dev builds only; never shipped. */}
        {__DEV__ ? (
          <View className="rounded-field border-line bg-ink-field gap-2 border p-4">
            <Text className="font-outfit-medium text-caption text-muted">DEV · API BASE</Text>
            <Text className="font-outfit text-callout text-fg">{API_BASE}</Text>
            <Text className="font-outfit text-label text-muted">
              Google sign-in {GOOGLE_SIGN_IN_ENABLED ? 'configured' : 'not configured'}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={confirmSignOut}
          accessibilityRole="button"
          className="rounded-button border-danger-line active:bg-danger-surface min-h-[52px] items-center justify-center border py-4">
          <Text className="font-outfit-semibold text-body text-danger">Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
