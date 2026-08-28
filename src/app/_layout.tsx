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
import { ToastProvider } from '@/components/ui/toast';
import { ThemeProvider } from '@/features/theme/theme';
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
        {/* Root-level, not inside (tabs): the Roster tab lists artists, and
            adding or editing one rises over the bar the way every other form
            in this app does. Both have to be declared here — a root route
            missing from this group is unreachable, and the router answers a
            push to it by trying to go back from a stack with no history. */}
        <Stack.Screen name="roster/new" options={{ presentation: 'modal' }} />
        {/* The artist is a destination — you arrive to read it. Editing them is
            a modal over it, like every other form here. */}
        <Stack.Screen name="roster/[id]/index" />
        <Stack.Screen name="roster/[id]/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="shared-with-me" />
        {/* A destination rather than a modal: it is a list you scroll and page
            through, and tapping a row pushes onto the release from here. */}
        <Stack.Screen name="notifications" />
        <Stack.Screen name="settings/notifications" />
        <Stack.Screen name="settings/appearance" />
        <Stack.Screen name="settings/about" />
      </Stack.Protected>

      <Stack.Protected guard={status === 'onboarding'}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>

      {/* Spans two states — reachable from onboarding, where an invited person
          is asked artist-or-label and is neither, AND from Profile once they
          are signed in. A compound guard rather than a bare Screen: anything
          left outside these groups is in the navigator even while `status` is
          `loading`, when every other route is excluded. It then becomes the
          only route there is, gets picked as the initial one, and has to be
          navigated away from a moment later — which is the "GO_BACK was not
          handled" warning, on every launch. */}
      <Stack.Protected guard={status === 'onboarding' || status === 'signedIn'}>
        <Stack.Screen name="accept-invite" options={{ presentation: 'modal' }} />
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
      {/* `auto` rather than `light`: the bar's glyphs have to invert with the
          ground, or they vanish into a white screen. */}
      <StatusBar style="auto" />
      <SafeAreaProvider>
        {/* Inside SafeAreaProvider because the stack is positioned against the
            top inset, and outside the navigator so a toast survives a screen
            change — a "saved" that vanishes with the screen that caused it
            tells nobody anything. */}
        {/* Outermost of the two: the toast stack reads theme colours, and the
            navigator's screens read both. */}
        <ThemeProvider>
          <ToastProvider>
            <SplashGate fontsReady={fontsReady} />
            <RootNavigator />
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </SessionProvider>
  );
}
