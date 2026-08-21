import { Image } from 'expo-image';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthButton } from '@/components/auth/auth-button';
import { useSession } from '@/features/auth/session';

// The same white mark the native splash draws, so the hand-off from splash to
// this screen changes nothing but the copy fading in beneath it.
const MARK = require('../../../assets/images/splash-icon.png');

/**
 * The anchor of the `(auth)` group, and so the first thing a signed-out
 * visitor sees. Without an `index` here the router fell through to the first
 * screen in the group — sign-in — which asked for credentials before it had
 * said what the product is.
 */
export default function WelcomeScreen() {
  const { status } = useSession();
  const router = useRouter();

  // `unverified` shares this group's guard, but those visitors already have an
  // account and are mid-signup — the introduction is not for them, and the
  // notice they need to read lives on sign-in.
  if (status === 'unverified') return <Redirect href="/sign-in" />;

  return (
    <View className="bg-ink flex-1">
      <StatusBar style="light" />

      {/* `className` does not reach `SafeAreaView` — react-native-css wraps the
          react-native components and `SafeAreaProvider`, but re-exports this one
          untouched, so its flex has to be a style. */}
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View className="w-full max-w-[400px] flex-1 self-center px-6 py-8">
          {/* The mark and copy share the free space above the buttons rather
              than sitting dead centre, which leaves the actions on the thumb
              half of tall screens without pinning them to the very bottom. */}
          <View className="flex-1 justify-center gap-8">
            <Image source={MARK} style={{ width: 96, height: 96 }} contentFit="contain" />

            <View className="gap-2">
              <Text className="font-outfit-bold text-[40px] text-white">FRNDSHQ</Text>
              <Text className="font-outfit text-[17px] text-white">
                Every stream, playlist and follower across your platforms, gathered in one place.
              </Text>
            </View>
          </View>

          <View className="gap-4">
            <AuthButton label="Create account" onPress={() => router.push('/sign-up')} />
            <AuthButton
              label="Log in"
              variant="secondary"
              onPress={() => router.push('/sign-in')}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
