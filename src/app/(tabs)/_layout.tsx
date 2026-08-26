import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { useSession } from '@/features/auth/session';
import { useThemeColors } from '@/features/theme/theme';
import { FontFamily } from '@/constants/theme';

/**
 * The signed-in shell: three destinations, nothing else.
 *
 * Deliberately JS tabs rather than `expo-router/unstable-native-tabs`. Native
 * tabs need Android vector drawables in `android/app/src/main/res/drawable/`,
 * and this project has never been prebuilt — there is no native folder to put
 * them in. A JS bar also restyles without a rebuild, which matters while the
 * design is still moving. Revisit native tabs before shipping, not before then.
 *
 * Creating a release is an ACTION, not a destination, so it is not a tab: it
 * opens as a modal over this shell, reached from the Releases header and the
 * Home call to action. Analytics stays out until Phase 2 gives it something to
 * show — a tab that opens onto "coming soon" teaches people not to tap it.
 *
 * Labels are always visible. Three tabs leave room for them, and "Releases" as
 * a bare glyph reads as library, albums or archive depending on the person.
 *
 * A LABEL account gets a fourth: Roster. It is hidden with `href: null` rather
 * than omitted, because expo-router registers every file in this folder as a
 * tab whether it is listed here or not — dropping the `Tabs.Screen` would show
 * it to everyone, which is the opposite of the intent.
 */
export default function TabsLayout() {
  // Read through the hook, not the `Brand` constant: none of this is reachable
  // by `className`, so the tab bar would stay black on a light device.
  const colors = useThemeColors();
  const { user } = useSession();
  const isLabel = user?.label != null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Follows the active scheme so the bar matches the screens above it.
        sceneStyle: { backgroundColor: colors.ink },
        tabBarActiveTintColor: colors.blueOnInk,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.ink,
          // The default bar carries a light hairline that reads as a seam on
          // black. `borderSubtle` keeps the separation without the glare.
          borderTopColor: colors.lineSubtle,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        // Tab bar styling is prop-shaped — `className` cannot reach any of it,
        // which is why `Brand` and `FontFamily` stay exported.
        tabBarLabelStyle: {
          fontFamily: FontFamily.medium,
          fontSize: 11,
        },
        tabBarItemStyle: { paddingVertical: 4 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="releases"
        options={{
          title: 'Releases',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'albums' : 'albums-outline'} size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="roster"
        options={{
          title: 'Roster',
          href: isLabel ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person-circle' : 'person-circle-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
