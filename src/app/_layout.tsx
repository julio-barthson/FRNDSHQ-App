// Imported by weight rather than from the package root: the root index
// `require`s all nine Outfit faces, and Metro would bundle every one of them.
import { Outfit_400Regular } from '@expo-google-fonts/outfit/400Regular';
import { Outfit_500Medium } from '@expo-google-fonts/outfit/500Medium';
import { Outfit_600SemiBold } from '@expo-google-fonts/outfit/600SemiBold';
import { Outfit_700Bold } from '@expo-google-fonts/outfit/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/global.css';

import { Brand } from '@/constants/brand';
import { SessionProvider, useSession } from '@/features/auth/session';

SplashScreen.preventAutoHideAsync();

/**
 * Holds the native splash until the stored session has been restored and
 * Outfit is registered, so a returning user never sees sign-in flash past on
 * the way to the tabs, nor a frame of the system font before Outfit lands.
 */
function SplashGate({ fontsReady }: { fontsReady: boolean }) {
  const { status } = useSession();

  useEffect(() => {
    if (status !== 'loading' && fontsReady) SplashScreen.hideAsync();
  }, [status, fontsReady]);

  return null;
}

function RootNavigator() {
  const { status } = useSession();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Brand.ink },
      }}>
      {/* One group per status, so a change of status moves the user on its own.
          Every guard is false while `loading`, which leaves the navigator empty
          behind the splash rather than picking a group and then swapping. */}
      <Stack.Protected guard={status === 'signedIn'}>
        <Stack.Screen name="(tabs)" />
        {/* Root-level rather than tabs, so they rise over the bar instead of
            becoming extra destinations. Creating is an action, not a place. */}
        <Stack.Screen name="new-release" options={{ presentation: 'modal' }} />
        <Stack.Screen name="release/[id]" />
        <Stack.Screen name="edit-release/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit-tracks/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
      </Stack.Protected>

      <Stack.Protected guard={status === 'onboarding'}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>

      <Stack.Protected guard={status === 'unverified'}>
        <Stack.Screen name="(verify)" />
      </Stack.Protected>

      <Stack.Protected guard={status === 'signedOut'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  // The whole app types in Outfit, so the four faces every text style can name
  // are loaded once here rather than per screen.
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  // A font that failed to load is not worth stranding the user behind the
  // splash for — the platform's own face is a readable fallback.
  const fontsReady = fontsLoaded || fontError != null;

  return (
    <SessionProvider>
      {/* The ground is set here as well as in the splash config so the native
          splash hands over without a visible change of colour. */}
      <StatusBar style="light" />
      <SafeAreaProvider>
        <SplashGate fontsReady={fontsReady} />
        <RootNavigator />
      </SafeAreaProvider>
    </SessionProvider>
  );
}
