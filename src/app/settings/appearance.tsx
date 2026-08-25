import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsChoice, SettingsSection } from '@/components/ui/settings-row';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useTheme, type ThemePreference } from '@/features/theme/theme';

const CHOICES: {
  value: ThemePreference;
  icon: 'phone-portrait-outline' | 'sunny-outline' | 'moon-outline';
  label: string;
  description: string;
}[] = [
  {
    value: 'system',
    icon: 'phone-portrait-outline',
    label: 'Match my device',
    description: 'Follows your phone, including when it changes at night.',
  },
  { value: 'light', icon: 'sunny-outline', label: 'Light', description: 'Always light.' },
  { value: 'dark', icon: 'moon-outline', label: 'Dark', description: 'Always dark.' },
];

/**
 * Light, dark, or the device's own.
 *
 * The choice applies as it is made rather than on a save button — there is
 * nothing to confirm when the result is the screen you are looking at.
 */
export default function AppearanceScreen() {
  const router = useRouter();
  const { preference, setPreference, scheme } = useTheme();

  return (
    // `className` does not reach `SafeAreaView`, so the ground goes on a wrapper.
    <View className="bg-ink flex-1">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScreenHeader title="Appearance" onPress={() => router.back()} />

        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-6 px-4 pb-16 pt-2"
          showsVerticalScrollIndicator={false}>
          <SettingsSection
            title="Theme"
            footnote={
              preference === 'system'
                ? `Following your device, which is currently ${scheme}.`
                : undefined
            }>
            {CHOICES.map((choice, index) => (
              <SettingsChoice
                key={choice.value}
                icon={choice.icon}
                label={choice.label}
                description={choice.description}
                selected={preference === choice.value}
                onPress={() => setPreference(choice.value)}
                first={index === 0}
              />
            ))}
          </SettingsSection>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
