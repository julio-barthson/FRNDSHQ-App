import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthAlert } from '@/components/auth/auth-alert';
import { TrackCard } from '@/components/catalogue/track-card';
import { Brand } from '@/constants/brand';
import {
  addTrack,
  getRelease,
  removeTrack,
  updateRelease,
  updateTrack,
} from '@/features/catalogue/api';
import { isEditable, totalRuntime } from '@/features/catalogue/detail';
import type { ReleaseDetail } from '@/features/catalogue/types';
import { ApiError } from '@/lib/api';

/** The API's own ceiling. */
const MAX_TRACKS = 30;

export default function EditTracksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [release, setRelease] = useState<ReleaseDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyTrackId, setBusyTrackId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      setRelease(await getRelease(id));
      setLoadError(null);
    } catch (caught) {
      setLoadError(caught instanceof ApiError ? caught.message : 'Could not load this release.');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  function report(caught: unknown, fallback: string) {
    setError(caught instanceof ApiError ? caught.message : fallback);
  }

  /** Every edit writes straight through, so the list is reloaded after each. */
  async function mutate(trackId: string, run: () => Promise<unknown>, fallback: string) {
    if (!release || busyTrackId) return;

    setBusyTrackId(trackId);
    setError(null);
    try {
      await run();
      await load();
    } catch (caught) {
      report(caught, fallback);
    } finally {
      setBusyTrackId(null);
    }
  }

  async function onAdd() {
    if (!release || adding) return;

    const title = newTitle.trim();
    if (!title) return;

    setAdding(true);
    setError(null);
    try {
      // A single holds exactly one track, so the release has to become an EP
      // before a second one is allowed. Two tracks is an EP by the API's own
      // rule, so this is promoted quietly rather than asking the artist to
      // understand release types.
      if (release.type === 'SINGLE') {
        await updateRelease(release.id, { type: 'EP' });
      }

      await addTrack(release.id, title);
      setNewTitle('');
      await load();
    } catch (caught) {
      report(caught, 'Could not add that track.');
    } finally {
      setAdding(false);
    }
  }

  function confirmRemove(trackId: string, title: string) {
    Alert.alert('Remove this track?', `"${title}" and its audio will be removed.`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void mutate(
            trackId,
            () => removeTrack(release!.id, trackId),
            'Could not remove that track.'
          );
        },
      },
    ]);
  }

  if (!release) {
    return (
      <View className="bg-ink flex-1 gap-4 px-4" style={{ paddingTop: insets.top + 24 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
          <Ionicons name="close" size={26} color={Brand.white} />
        </Pressable>
        {loadError ? (
          <AuthAlert messages={[loadError]} onRetry={() => void load()} />
        ) : (
          <ActivityIndicator color={Brand.violetInk} />
        )}
      </View>
    );
  }

  if (!isEditable(release.status)) {
    return (
      <View className="bg-ink flex-1 gap-4 px-4" style={{ paddingTop: insets.top + 24 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
          <Ionicons name="close" size={26} color={Brand.white} />
        </Pressable>
        <View className="bg-ink-raised rounded-card gap-2 p-4">
          <Text className="font-outfit-semibold text-heading text-fg">Locked</Text>
          <Text className="font-outfit text-body text-muted">
            This release has been submitted, so its tracks can no longer be changed.
          </Text>
        </View>
      </View>
    );
  }

  const runtime = totalRuntime(release.tracks);
  const count = release.tracks.length;
  const full = count >= MAX_TRACKS;

  return (
    <View className="bg-ink flex-1" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-4 px-4 pt-4 pb-4">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}>
          <Ionicons name="close" size={26} color={Brand.white} />
        </Pressable>

        <View className="flex-1">
          <Text className="font-outfit-bold text-title text-fg">Tracks</Text>
          <Text className="font-outfit text-label text-muted">
            {count} of {MAX_TRACKS}
            {runtime ? ` · ${runtime}` : ''}
          </Text>
        </View>

        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
          <Text className="font-outfit-semibold text-body text-violet-ink">Done</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="gap-3 px-4 pb-16"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          <AuthAlert messages={[error]} />

          {release.tracks.map((track, index) => (
            <Animated.View
              key={track.id}
              entering={FadeInDown.delay(Math.min(index, 8) * 50).duration(320)}>
              <TrackCard
                releaseId={release.id}
                track={track}
                expanded={expandedId === track.id}
                busy={busyTrackId === track.id}
                canRemove={count > 1}
                onToggle={() => setExpandedId(expandedId === track.id ? null : track.id)}
                onRename={(title) =>
                  void mutate(
                    track.id,
                    () => updateTrack(release.id, track.id, { title }),
                    'Could not rename that track.'
                  )
                }
                onVersion={(versionTitle) =>
                  void mutate(
                    track.id,
                    () => updateTrack(release.id, track.id, { versionTitle }),
                    'Could not save that version name.'
                  )
                }
                onExplicit={(explicit) =>
                  void mutate(
                    track.id,
                    () => updateTrack(release.id, track.id, { explicit }),
                    'Could not change that setting.'
                  )
                }
                onRemove={() => confirmRemove(track.id, track.title)}
                onChanged={() => void load()}
              />
            </Animated.View>
          ))}

          {/* A dashed tile at the end of the list rather than a field and a
              button below it — it reads as part of the list, and matches the
              audio dropzone inside each card. */}
          {full ? (
            <View className="border-line rounded-card items-center border border-dashed p-4">
              <Text className="font-outfit text-callout text-muted text-center">
                That&apos;s the maximum of {MAX_TRACKS} tracks.
              </Text>
            </View>
          ) : (
            <View className="border-line rounded-card gap-3 border border-dashed p-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="add-circle-outline" size={18} color={Brand.violetInk} />
                <Text className="font-outfit-semibold text-callout text-fg">Add a track</Text>
              </View>

              <TextInput
                className="rounded-field border-line bg-ink-field font-outfit text-body text-fg border px-4 py-[12px]"
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Track title"
                placeholderTextColor={Brand.muted}
                selectionColor={Brand.blue}
                returnKeyType="done"
                onSubmitEditing={() => void onAdd()}
                editable={!adding}
                accessibilityLabel="New track title"
              />

              <Pressable
                onPress={() => void onAdd()}
                disabled={!newTitle.trim() || adding}
                accessibilityRole="button"
                accessibilityState={{ disabled: !newTitle.trim(), busy: adding }}
                className={`rounded-button min-h-[44px] items-center justify-center py-3 ${
                  !newTitle.trim() || adding
                    ? 'bg-violet opacity-40'
                    : 'bg-violet active:bg-violet-pressed'
                }`}>
                {adding ? (
                  <ActivityIndicator color={Brand.white} />
                ) : (
                  <Text className="font-outfit-bold text-callout text-white">Add track</Text>
                )}
              </Pressable>

              {release.type === 'SINGLE' && count === 1 ? (
                <Text className="font-outfit text-caption text-muted">
                  Adding a second track turns this single into an EP.
                </Text>
              ) : null}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
