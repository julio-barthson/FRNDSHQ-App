import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthAlert } from '@/components/auth/auth-alert';
import { ArtistsSheet } from '@/components/catalogue/artists-sheet';
import { ReorderSheet } from '@/components/catalogue/reorder-sheet';
import { TrackCard } from '@/components/catalogue/track-card';
import { KeyboardScroll } from '@/components/ui/keyboard-scroll';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Brand } from '@/constants/brand';
import {
  addTrack,
  getRelease,
  removeTrack,
  reorderTracks,
  updateRelease,
  updateTrack,
} from '@/features/catalogue/api';
import { isEditable, totalRuntime } from '@/features/catalogue/detail';
import type { ContributorInput, ReleaseDetail } from '@/features/catalogue/types';
import { useTrackPlayer } from '@/features/catalogue/use-track-player';
import { useTrackUploads } from '@/features/catalogue/use-track-uploads';
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

  const [reorderOpen, setReorderOpen] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);

  // The id of the track whose artists are being edited, not a boolean — the
  // sheet needs to know which track it is showing.
  const [artistsTrackId, setArtistsTrackId] = useState<string | null>(null);
  const [artistsPending, setArtistsPending] = useState(false);
  const [artistsError, setArtistsError] = useState<string | null>(null);

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

  // Held here rather than inside each card, so closing one does not abandon its
  // transfer and an album can send every master at once.
  const { uploads, start: startUpload, activeCount } = useTrackUploads(id, load);

  const player = useTrackPlayer(
    useCallback(
      async (trackId: string) => {
        // Playback URLs are presigned and short-lived, so the release is
        // fetched again to produce a fresh one.
        const fresh = await getRelease(id);
        setRelease(fresh);
        return fresh.tracks.find((candidate) => candidate.id === trackId)?.audioUrl ?? null;
      },
      [id]
    )
  );

  // Validation finishes server-side with nothing to notify us, so while any
  // track is mid-check the screen asks again on a timer — the same poll the
  // release page runs, and it stops as soon as nothing is left checking.
  const hasProcessing = release?.tracks.some((track) => track.status === 'PROCESSING') ?? false;

  useEffect(() => {
    if (!hasProcessing) return;
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [hasProcessing, load]);

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

  async function onSaveOrder(trackIds: string[]) {
    if (!release || reordering) return;

    setReordering(true);
    setReorderError(null);
    try {
      setRelease(await reorderTracks(release.id, trackIds));
      setReorderOpen(false);
    } catch (caught) {
      setReorderError(
        caught instanceof ApiError ? caught.message : 'Could not save the new order.'
      );
    } finally {
      setReordering(false);
    }
  }

  async function onSaveArtists(trackId: string, contributors: ContributorInput[]) {
    if (!release || artistsPending) return;

    setArtistsPending(true);
    setArtistsError(null);
    try {
      setRelease(await updateTrack(release.id, trackId, { contributors }));
      setArtistsTrackId(null);
    } catch (caught) {
      setArtistsError(
        caught instanceof ApiError ? caught.message : 'Could not save those artists.'
      );
    } finally {
      setArtistsPending(false);
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

  /**
   * Leaving is not cancelling — the transfers keep running — but the app has to
   * stay open for them, and closing a modal reads like stopping. Better to say
   * so than to let someone background the phone on a half-sent album.
   */
  function close() {
    player.stop();

    if (activeCount === 0) return router.back();

    Alert.alert(
      activeCount === 1 ? 'An upload is still running' : `${activeCount} uploads are still running`,
      'They will carry on while the app is open, but leaving now means you will not see them finish.',
      [
        { text: 'Stay here', style: 'cancel' },
        { text: 'Leave anyway', onPress: () => router.back() },
      ]
    );
  }

  if (!release) {
    return (
      <View className="bg-ink flex-1">
        <ScreenHeader icon="close" label="Close" onPress={() => router.back()} />
        <View className="gap-4 px-4">
          {loadError ? (
            <AuthAlert messages={[loadError]} onRetry={() => void load()} />
          ) : (
            <ActivityIndicator color={Brand.blueOnInk} />
          )}
        </View>
      </View>
    );
  }

  if (!isEditable(release.status)) {
    return (
      <View className="bg-ink flex-1">
        <ScreenHeader icon="close" label="Close" onPress={() => router.back()} />
        <View className="gap-4 px-4">
          <View className="bg-ink-raised rounded-card gap-2 p-4">
            <Text className="font-outfit-semibold text-heading text-fg">Locked</Text>
            <Text className="font-outfit text-body text-muted">
              This release has been submitted, so its tracks can no longer be changed.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const runtime = totalRuntime(release.tracks);
  const count = release.tracks.length;
  const full = count >= MAX_TRACKS;
  const artistsTrack = release.tracks.find((track) => track.id === artistsTrackId) ?? null;

  return (
    <View className="bg-ink flex-1">
      <ScreenHeader
        icon="close"
        label="Close"
        title="Tracks"
        subtitle={`${count} of ${MAX_TRACKS}${runtime ? ` · ${runtime}` : ''}`}
        onPress={close}
        right={
          <Pressable onPress={close} accessibilityRole="button" hitSlop={12}>
            <Text className="font-outfit-semibold text-body text-blue-ink">Done</Text>
          </Pressable>
        }
      />

      <KeyboardScroll contentContainerClassName="gap-3 px-4" bottomInset={insets.bottom + 40}>
        <AuthAlert messages={[error, player.error]} />

        {/* Only from two tracks up. A single has no running order to decide. */}
        {count > 1 ? (
          <Pressable
            onPress={() => {
              setReorderError(null);
              setReorderOpen(true);
            }}
            accessibilityRole="button"
            className="border-line rounded-card active:bg-ink-high flex-row items-center gap-3 border p-3">
            <Ionicons name="swap-vertical" size={18} color={Brand.blueOnInk} />
            <Text className="font-outfit-semibold text-callout text-fg flex-1">
              Change the running order
            </Text>
            <Ionicons name="chevron-forward" size={18} color={Brand.muted} />
          </Pressable>
        ) : null}

        {release.tracks.map((track, index) => (
          <Animated.View
            key={track.id}
            entering={FadeInDown.delay(Math.min(index, 8) * 50).duration(320)}>
            <TrackCard
              track={track}
              expanded={expandedId === track.id}
              busy={busyTrackId === track.id}
              canRemove={count > 1}
              upload={uploads[track.id]}
              playing={player.playingId === track.id && player.playing}
              playerLoading={player.loadingId === track.id}
              position={player.position}
              duration={player.duration || (track.durationSec ?? 0)}
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
              onPickAudio={() => void startUpload(track.id)}
              onPlay={() => void player.toggle(track)}
              onSeek={player.seek}
              onEditArtists={() => {
                setArtistsError(null);
                setArtistsTrackId(track.id);
              }}
              inheritedArtist={release.displayArtist}
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
              <Ionicons name="add-circle-outline" size={18} color={Brand.blueOnInk} />
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
                  ? 'bg-blue opacity-40'
                  : 'bg-blue active:bg-blue-pressed'
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
      </KeyboardScroll>

      {artistsTrack ? (
        <ArtistsSheet
          visible
          scope="track"
          title={artistsTrack.title}
          versionTitle={artistsTrack.versionTitle}
          contributors={artistsTrack.contributors}
          inheritedArtist={release.displayArtist}
          pending={artistsPending}
          error={artistsError}
          onCancel={() => setArtistsTrackId(null)}
          onSave={(rows) => void onSaveArtists(artistsTrack.id, rows)}
        />
      ) : null}

      <ReorderSheet
        visible={reorderOpen}
        tracks={release.tracks}
        pending={reordering}
        error={reorderError}
        onCancel={() => setReorderOpen(false)}
        onSave={(trackIds) => void onSaveOrder(trackIds)}
      />
    </View>
  );
}
