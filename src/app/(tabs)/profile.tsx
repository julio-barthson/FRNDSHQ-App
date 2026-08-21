import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glow } from '@/components/ui/illustrations';
import { Brand } from '@/constants/brand';
import { findCountry } from '@/constants/countries';
import { useSession } from '@/features/auth/session';
import { API_BASE, GOOGLE_SIGN_IN_ENABLED } from '@/lib/env';

const TERMS_URL = 'https://frndshq.com/terms';
const PRIVACY_URL = 'https://frndshq.com/privacy';

function SectionHeading({ children }: { children: string }) {
  return <Text className="font-outfit-medium text-caption text-muted">{children}</Text>;
}

function Row({
  label,
  value,
  icon,
  onPress,
}: {
  label: string;
  value?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}) {
  const content = (
    <View className="flex-row items-center gap-3 py-3">
      {icon ? <Ionicons name={icon} size={18} color={Brand.muted} /> : null}
      <Text className="font-outfit text-callout text-fg flex-1">{label}</Text>
      {value ? (
        <Text className="font-outfit text-callout text-muted" numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={16} color={Brand.muted} /> : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="active:opacity-70">
      {content}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useSession();

  // Exactly one of these is set once onboarding has chosen.
  const displayName = user?.artist?.stageName ?? user?.label?.name ?? null;
  const avatarUrl = user?.artist?.avatarUrl ?? user?.label?.logoUrl ?? user?.image ?? null;
  const isLabel = user?.label != null;
  const country = findCountry(user?.country ?? '');
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
              <View className="border-violet-line bg-violet-surface h-[96px] w-[96px] items-center justify-center rounded-full border">
                <Text className="font-outfit-bold text-display text-violet-ink">
                  {(displayName ?? user?.email ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View className="items-center gap-2">
            <Text className="font-outfit-bold text-title text-fg text-center">
              {displayName ?? 'Your profile'}
            </Text>

            <View className="border-violet-line bg-violet-surface rounded-full border px-3 py-[3px]">
              <Text className="font-outfit-medium text-caption text-violet-ink">
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

        <Animated.View entering={FadeInDown.delay(60).duration(340)} className="gap-2">
          <SectionHeading>ACCOUNT</SectionHeading>
          <View className="bg-ink-raised rounded-card px-4 py-1">
            <Row label="Email" value={user?.email} />
            <Row
              label="Email verified"
              value={user?.emailVerified ? 'Yes' : 'Not yet'}
              icon={undefined}
            />
            <Row label="Phone" value={user?.phoneNumber ?? 'Not set'} />
            <Row label="Country" value={country?.name ?? 'Not set'} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(340)} className="gap-2">
          <SectionHeading>LEGAL</SectionHeading>
          <View className="bg-ink-raised rounded-card px-4 py-1">
            {/* Opened in the in-app browser rather than leaving the app —
                both stores expect these to be reachable from inside it. */}
            <Row
              label="Terms of Service"
              icon="document-text-outline"
              onPress={() => void WebBrowser.openBrowserAsync(TERMS_URL)}
            />
            <Row
              label="Privacy Policy"
              icon="lock-closed-outline"
              onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)}
            />
          </View>
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
