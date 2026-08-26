import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRosterArtistForm } from '@/components/label/roster-artist-form';
import { KeyboardScroll } from '@/components/ui/keyboard-scroll';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useToast } from '@/components/ui/toast';
import { Brand } from '@/constants/brand';
import { createRosterArtist } from '@/features/label/api';

/**
 * Signing an artist to the roster.
 *
 * No email, no password, no invite: a roster artist is a metadata identity the
 * label owns, which is the industry model and what `Artist.userId` is nullable
 * for. Giving an artist their own login is a seat, a separate concept, and a
 * later phase.
 */
export default function NewRosterArtistScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

  const [saving, setSaving] = useState(false);
  const { dirty, validate, capture, form } = useRosterArtistForm(null, saving);

  function close() {
    if (!dirty) return router.back();

    Alert.alert('Discard this artist?', 'Nothing will be added to your roster.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  async function onSave() {
    if (saving) return;

    const payload = validate();
    if (!payload) return;

    setSaving(true);
    try {
      const artist = await createRosterArtist(payload);
      toast.success(`${artist.stageName} added to your roster`);
      router.back();
    } catch (caught) {
      capture(caught);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="bg-ink flex-1" style={{ paddingTop: insets.top }}>
      <ScreenHeader icon="close" label="Close" title="Add artist" onPress={close} />

      <KeyboardScroll contentContainerClassName="gap-6 px-4" bottomInset={insets.bottom + 100}>
        {form}
      </KeyboardScroll>

      <View
        className="border-line-subtle bg-ink absolute right-0 bottom-0 left-0 border-t px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}>
        <Pressable
          onPress={() => void onSave()}
          disabled={saving}
          accessibilityRole="button"
          accessibilityState={{ busy: saving }}
          className={`rounded-button min-h-[52px] items-center justify-center py-4 ${
            saving ? 'bg-blue opacity-40' : 'bg-blue active:bg-blue-pressed'
          }`}>
          {saving ? (
            <ActivityIndicator color={Brand.white} />
          ) : (
            <Text className="font-outfit-bold text-body text-white">Add to roster</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
