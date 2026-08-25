import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Linking, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { SettingsLink, SettingsSection } from '@/components/ui/settings-row';
import { useToast } from '@/components/ui/toast';

const TERMS_URL = 'https://frndshq.com/terms';
const PRIVACY_URL = 'https://frndshq.com/privacy';
const SUPPORT_EMAIL = 'support@frndshq.com';

/**
 * Version, the legal pages, and a way to reach a person.
 *
 * The three links point at a domain that does not resolve yet. They are here
 * rather than hidden because both stores require a reachable privacy policy at
 * submission — leaving them out would mean discovering that at review time.
 * Opening one that fails says so plainly instead of doing nothing.
 */
export default function AboutScreen() {
  const router = useRouter();
  const toast = useToast();

  const version = Constants.expoConfig?.version ?? '1.0.0';

  async function open(url: string, label: string) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('unsupported');
      await Linking.openURL(url);
    } catch {
      toast.error(`Could not open ${label}`, 'Please try again later.');
    }
  }

  return (
    <View className="bg-ink flex-1">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScreenHeader title="About" onPress={() => router.back()} />

        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-6 px-4 pb-16 pt-2"
          showsVerticalScrollIndicator={false}>
          <SettingsSection title="Legal">
            <SettingsLink
              icon="document-text-outline"
              label="Terms of use"
              onPress={() => void open(TERMS_URL, 'the terms')}
              first
            />
            <SettingsLink
              icon="lock-closed-outline"
              label="Privacy policy"
              onPress={() => void open(PRIVACY_URL, 'the privacy policy')}
            />
          </SettingsSection>

          <SettingsSection title="Help">
            <SettingsLink
              icon="chatbubble-ellipses-outline"
              label="Contact support"
              value={SUPPORT_EMAIL}
              onPress={() => void open(`mailto:${SUPPORT_EMAIL}`, 'your mail app')}
              first
            />
          </SettingsSection>

          <View className="items-center gap-1 pt-4">
            <Text className="font-outfit-semibold text-label text-fg">FRNDSHQ</Text>
            <Text className="font-outfit-regular text-label text-muted">Version {version}</Text>
            <Text className="font-outfit-regular text-caption text-muted mt-1 text-center">
              Your music deserves a better platform.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
