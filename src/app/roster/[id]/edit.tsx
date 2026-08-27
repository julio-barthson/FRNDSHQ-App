import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRosterArtistForm } from '@/components/label/roster-artist-form';
import { KeyboardScroll } from '@/components/ui/keyboard-scroll';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useToast } from '@/components/ui/toast';
import { Brand } from '@/constants/brand';
import { getRosterArtist, removeRosterArtist, updateRosterArtist } from '@/features/label/api';
import type { RosterArtist } from '@/features/label/types';
import { ApiError } from '@/lib/api';

export default function EditRosterArtistScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [artist, setArtist] = useState<RosterArtist | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const loaded = await getRosterArtist(id);
        if (!cancelled) setArtist(loaded);
      } catch (caught) {
        if (cancelled) return;
        setLoadError(
          caught instanceof ApiError ? caught.message : 'Could not load this artist.'
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return artist ? (
    <Loaded artist={artist} saving={saving} setSaving={setSaving} />
  ) : (
    <View className="bg-ink flex-1" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        icon="close"
        label="Close"
        title="Artist"
        onPress={() => router.back()}
      />
      <View className="flex-1 items-center justify-center gap-3 px-8">
        {loadError ? (
          <Text className="font-outfit text-body text-muted text-center">{loadError}</Text>
        ) : (
          <ActivityIndicator color={Brand.blue} />
        )}
      </View>
    </View>
  );
}

/**
 * Split out so the form's `useState` initialisers see the loaded artist. A
 * hook cannot re-initialise from a prop that arrives later, and seeding the
 * fields with empty strings then patching them would fight the dirty check.
 */
function Loaded({
  artist,
  saving,
  setSaving,
}: {
  artist: RosterArtist;
  saving: boolean;
  setSaving: (value: boolean) => void;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

  const { dirty, validate, capture, form } = useRosterArtistForm(artist, saving);

  const close = useCallback(() => {
    if (!dirty) return router.back();

    Alert.alert('Discard changes?', `Your edits to ${artist.stageName} will be lost.`, [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  }, [artist.stageName, dirty, router]);

  async function onSave() {
    if (saving || !dirty) return;

    const payload = validate();
    if (!payload) return;

    setSaving(true);
    try {
      await updateRosterArtist(artist.id, payload);
      toast.success('Artist saved');
      router.back();
    } catch (caught) {
      capture(caught);
    } finally {
      setSaving(false);
    }
  }

  function onRemove() {
    Alert.alert(
      `Remove ${artist.stageName}?`,
      'They will no longer appear on your roster. Releases already under this artist keep it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setSaving(true);
              try {
                await removeRosterArtist(artist.id);
                toast.success(`${artist.stageName} removed`);
                router.back();
              } catch (caught) {
                // The API refuses once an artist has releases, and that
                // sentence names the count — worth showing verbatim.
                toast.error(
                  caught instanceof ApiError ? caught.message : 'Could not remove this artist.'
                );
              } finally {
                setSaving(false);
              }
            })();
          },
        },
      ]
    );
  }

  return (
    <View className="bg-ink flex-1" style={{ paddingTop: insets.top }}>
      <ScreenHeader icon="close" label="Close" title={artist.stageName} onPress={close} />

      <KeyboardScroll contentContainerClassName="gap-6 px-4" bottomInset={insets.bottom + 100}>
        {form}

        <Pressable
          onPress={onRemove}
          disabled={saving}
          accessibilityRole="button"
          className="rounded-card border-danger/40 min-h-[52px] items-center justify-center border py-4 active:opacity-70">
          <Text className="font-outfit-semibold text-body text-danger">Remove from roster</Text>
        </Pressable>
      </KeyboardScroll>

      <View
        className="border-line-subtle bg-ink absolute right-0 bottom-0 left-0 border-t px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}>
        <Pressable
          onPress={() => void onSave()}
          disabled={!dirty || saving}
          accessibilityRole="button"
          accessibilityState={{ disabled: !dirty, busy: saving }}
          className={`rounded-button min-h-[52px] items-center justify-center py-4 ${
            !dirty || saving ? 'bg-blue opacity-40' : 'bg-blue active:bg-blue-pressed'
          }`}>
          {saving ? (
            <ActivityIndicator color={Brand.white} />
          ) : (
            <Text className="font-outfit-bold text-body text-white">
              {dirty ? 'Save changes' : 'No changes to save'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
