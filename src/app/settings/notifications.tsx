import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { SettingsSection, SettingsSwitch } from '@/components/ui/settings-row';
import { useToast } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session';

/**
 * What reaches you, and where.
 *
 * Only one thing is actually switchable, and that is deliberate: the in-app
 * centre is a record rather than a preference. An artist who turned it off
 * could never find out why a release came back, so it is shown as permanently
 * on with the reason next to it instead of being quietly absent.
 */
export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { user, saveProfile } = useSession();
  const toast = useToast();

  const [email, setEmail] = useState(user?.emailNotifications ?? true);
  const [saving, setSaving] = useState(false);

  async function toggleEmail(next: boolean) {
    // Flipped first so the switch answers the thumb, then reverted if the save
    // fails — a control that waits on the network feels broken.
    setEmail(next);
    setSaving(true);

    try {
      await saveProfile({ emailNotifications: next });
      toast.success(next ? 'Email notifications on' : 'Email notifications off');
    } catch (caught) {
      setEmail(!next);
      toast.error(
        'Could not save that',
        caught instanceof Error ? caught.message : 'Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="bg-ink flex-1">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScreenHeader title="Notifications" onPress={() => router.back()} />

        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-6 px-4 pb-16 pt-2"
          showsVerticalScrollIndicator={false}>
          <SettingsSection
            title="How we reach you"
            footnote="We only email about your own catalogue — a release being submitted, approved or sent back. Never marketing.">
            <SettingsSwitch
              icon="notifications-outline"
              label="In the app"
              description="Always on. This is the record of what happened."
              value
              onValueChange={() => {}}
              disabled
              first
            />
            <SettingsSwitch
              icon="mail-outline"
              label="Email"
              description="A copy of the same messages, sent to your address."
              value={email}
              onValueChange={(next) => void toggleEmail(next)}
              disabled={saving}
            />
          </SettingsSection>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
