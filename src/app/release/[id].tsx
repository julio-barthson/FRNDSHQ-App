import Ionicons from '@expo/vector-icons/Ionicons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthAlert } from '@/components/auth/auth-alert';
import { Artwork } from '@/components/catalogue/artwork';
import { ProgressStrip } from '@/components/catalogue/progress-strip';
import { STATUS_EXPLAINER, StatusBadge } from '@/components/catalogue/status-badge';
import { BackdropScrim, Glow } from '@/components/ui/illustrations';
import { Brand } from '@/constants/brand';
import { deleteRelease, getRelease, submitRelease } from '@/features/catalogue/api';
import {
  formatDate,
  isEditable,
  submissionChecklist,
  totalRuntime,
  trackMeta,
} from '@/features/catalogue/detail';
import type { DetailTrack, ReleaseDetail } from '@/features/catalogue/types';
import { ApiError } from '@/lib/api';

const TYPE_LABEL: Record<ReleaseDetail['type'], string> = {
  SINGLE: 'Single',
  EP: 'EP',
  ALBUM: 'Album',
};

/** Sections drift up in sequence rather than all snapping in at once. */
function Section({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(340)} className="gap-2">
      {children}
    </Animated.View>
  );
}

function SectionHeading({ children }: { children: string }) {
  return <Text className="font-outfit-medium text-caption text-muted">{children}</Text>;
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <View className="flex-row items-start justify-between gap-4 py-2">
      <Text className="font-outfit text-callout text-muted">{label}</Text>
      <Text className="font-outfit text-callout text-fg flex-1 text-right">
        {value ?? 'Not set'}
      </Text>
    </View>
  );
}

function elapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * The scrubber. A tappable bar rather than a real slider — a draggable thumb
 * would mean another native dependency for a control used on one screen, and
 * tap-to-seek covers what an artist checking their own master actually does.
 */
function Scrubber({
  position,
  duration,
  onSeek,
}: {
  position: number;
  duration: number;
  onSeek: (seconds: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const fraction = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <View className="gap-1">
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="Seek"
        hitSlop={10}
        onPress={(event) => {
          // `locationX` is relative to the bar, so turning it into a time needs
          // the bar's measured width.
          if (width > 0 && duration > 0) {
            onSeek((event.nativeEvent.locationX / width) * duration);
          }
        }}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        <View className="bg-ink-high h-[4px] overflow-hidden rounded-full">
          <View className="bg-violet h-full rounded-full" style={{ width: `${fraction * 100}%` }} />
        </View>
      </Pressable>

      <View className="flex-row justify-between">
        <Text className="font-outfit text-caption text-muted">{elapsed(position)}</Text>
        <Text className="font-outfit text-caption text-muted">{elapsed(duration)}</Text>
      </View>
    </View>
  );
}

function TrackRow({
  track,
  playing,
  position,
  duration,
  onPlay,
  onSeek,
}: {
  track: DetailTrack;
  playing: boolean;
  position: number;
  duration: number;
  onPlay: () => void;
  onSeek: (seconds: number) => void;
}) {
  const meta = trackMeta(track);
  const playable = Boolean(track.audioUrl) && track.status === 'READY';

  return (
    <View className="bg-ink-raised rounded-card flex-row items-center gap-3 p-3">
      <View className="bg-ink-high h-[36px] w-[36px] items-center justify-center rounded-full">
        <Text className="font-outfit-semibold text-label text-muted">{track.trackNumber}</Text>
      </View>

      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <Text className="font-outfit-semibold text-body text-fg flex-1" numberOfLines={1}>
            {track.title}
            {track.versionTitle ? ` (${track.versionTitle})` : ''}
          </Text>
          {track.explicit ? (
            <View className="bg-ink-high rounded-[4px] px-1" accessibilityLabel="Explicit content">
              <Text className="font-outfit-bold text-caption text-muted">E</Text>
            </View>
          ) : null}
        </View>

        <Text
          className={`font-outfit text-label ${meta.bad ? 'text-danger' : 'text-muted'}`}
          numberOfLines={2}>
          {meta.text}
        </Text>

        {playing ? <Scrubber position={position} duration={duration} onSeek={onSeek} /> : null}
      </View>

      {playable ? (
        <Pressable
          onPress={onPlay}
          accessibilityRole="button"
          accessibilityLabel={playing ? `Pause ${track.title}` : `Play ${track.title}`}
          className="bg-violet active:bg-violet-pressed h-[40px] w-[40px] items-center justify-center rounded-full">
          <Ionicons name={playing ? 'pause' : 'play'} size={18} color={Brand.white} />
        </Pressable>
      ) : null}
    </View>
  );
}

export default function ReleaseDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [release, setRelease] = useState<ReleaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  const player = useAudioPlayer();
  const playerStatus = useAudioPlayerStatus(player);

  // Without this a master is silent on an iPhone with the ringer switch off,
  // which reads as a broken upload rather than a muted phone.
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  const load = useCallback(async () => {
    try {
      setRelease(await getRelease(id));
      setError(null);
    } catch (caught) {
      // Another artist's release reads as missing rather than forbidden.
      setError(caught instanceof ApiError ? caught.message : 'Could not load this release.');
    }
  }, [id]);

  // Reloads on focus so edits made in the edit modals are reflected on return.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  // Audio validation finishes server-side with nothing to notify us, so while
  // any track is mid-check the screen asks again on a timer. It stops the
  // moment none are left, rather than polling for the life of the screen.
  const hasProcessing = release?.tracks.some((track) => track.status === 'PROCESSING') ?? false;

  useEffect(() => {
    if (!hasProcessing) return;
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [hasProcessing, load]);

  async function onPlayTrack(track: DetailTrack) {
    if (!release) return;

    if (playingTrackId === track.id) {
      player.pause();
      setPlayingTrackId(null);
      return;
    }

    if (!track.audioUrl) return;

    // Playback URLs are presigned and short-lived. Rather than track their age,
    // ask for the release again so the URL about to be played is fresh.
    setActionError(null);
    try {
      const fresh = await getRelease(release.id);
      setRelease(fresh);

      const url = fresh.tracks.find((candidate) => candidate.id === track.id)?.audioUrl;
      if (!url) {
        setActionError('That track is no longer playable. Reopen the release to refresh it.');
        return;
      }

      player.replace({ uri: url });
      player.play();
      setPlayingTrackId(track.id);
    } catch {
      setActionError('Could not start playback. Please try again.');
    }
  }

  async function onSubmit() {
    if (!release || submitting) return;

    // The screen is about to become read-only; a transport left running over
    // a locked release is confusing.
    player.pause();
    setPlayingTrackId(null);

    setSubmitting(true);
    setActionError(null);
    try {
      setRelease(await submitRelease(release.id));
    } catch (caught) {
      // The API returns the same checklist this screen mirrors, as an array —
      // `details` carries every reason, not just the first.
      setActionError(
        caught instanceof ApiError && caught.details.length > 0
          ? caught.details.join('\n')
          : caught instanceof ApiError
            ? caught.message
            : 'Could not submit this release. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  function onDelete() {
    if (!release || deleting) return;

    // A native confirm rather than an inline control: deleting takes the
    // uploaded files with it and cannot be undone.
    Alert.alert(
      'Delete this release?',
      `"${release.title}" and anything uploaded to it will be removed. This cannot be undone.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setDeleting(true);
            deleteRelease(release.id)
              .then(() => router.back())
              .catch((caught: unknown) => {
                setActionError(
                  caught instanceof ApiError ? caught.message : 'Could not delete this release.'
                );
                setDeleting(false);
              });
          },
        },
      ]
    );
  }

  if (!release) {
    return (
      <View className="bg-ink flex-1 gap-4 px-4" style={{ paddingTop: insets.top + 24 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={Brand.blueOnInk} />
        </Pressable>
        {error ? (
          <AuthAlert messages={[error]} onRetry={() => void load()} />
        ) : (
          <ActivityIndicator color={Brand.violetInk} />
        )}
      </View>
    );
  }

  const editable = isEditable(release.status);
  const checklist = submissionChecklist(release);
  const doneCount = checklist.filter((item) => item.done).length;
  const ready = doneCount === checklist.length;
  const explainer = STATUS_EXPLAINER[release.status];
  const runtime = totalRuntime(release.tracks);
  const meta = [
    TYPE_LABEL[release.type],
    `${release.tracks.length} ${release.tracks.length === 1 ? 'track' : 'tracks'}`,
    runtime,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View className="bg-ink flex-1">
      {/* The cover, blurred, behind the top of the page. Every release gets its
          own palette for free — the artwork does the art direction. */}
      <View pointerEvents="none" className="absolute top-0 right-0 left-0 h-[440px]">
        {release.artworkUrl ? (
          <Image
            source={{ uri: release.artworkUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            blurRadius={60}
          />
        ) : (
          <View className="bg-violet-surface absolute inset-0" />
        )}
        <View className="absolute inset-0">
          <BackdropScrim />
        </View>
      </View>

      <ScrollView
        contentContainerClassName={`gap-6 px-4 ${editable ? 'pb-[180px]' : 'pb-16'}`}
        contentContainerStyle={{ paddingTop: insets.top + 16 }}
        showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          className="self-start">
          <Ionicons name="chevron-back" size={26} color={Brand.white} />
        </Pressable>

        <View className="items-center gap-4 px-4">
          <View className="h-[200px] w-[200px] items-center justify-center">
            {/* Sits behind the cover, larger than it, so the falloff shows. */}
            <View pointerEvents="none" className="absolute h-[260px] w-[260px]">
              <Glow />
            </View>
            <Artwork
              url={release.artworkUrl}
              seedChar={release.title.charAt(0)}
              radius={16}
              className="h-[190px] w-[190px]"
            />
          </View>

          <View className="items-center gap-2">
            <Text className="font-outfit-bold text-title text-fg text-center">{release.title}</Text>
            <Text className="font-outfit text-callout text-muted">{meta}</Text>
            <StatusBadge status={release.status} />
            {explainer ? (
              <Text className="font-outfit text-label text-muted">{explainer}</Text>
            ) : null}
          </View>
        </View>

        <AuthAlert messages={[actionError]} />

        {/* Only once it has entered the process. A draft is not in any queue. */}
        {!editable ? (
          <Section index={0}>
            <ProgressStrip status={release.status} />
          </Section>
        ) : null}

        {/* Why it came back. The only place review notes are ever shown. */}
        {release.status === 'REJECTED' && release.reviewNotes ? (
          <Section index={0}>
            <View className="rounded-card border-l-danger bg-ink-raised gap-2 border-l-[3px] p-4">
              <SectionHeading>WHAT NEEDS FIXING</SectionHeading>
              <Text className="font-outfit text-body text-fg">{release.reviewNotes}</Text>
            </View>
          </Section>
        ) : null}

        {editable ? (
          <Section index={1}>
            <View className="flex-row items-center justify-between">
              <SectionHeading>BEFORE YOU SUBMIT</SectionHeading>
              <Text
                className={`font-outfit-semibold text-label ${
                  ready ? 'text-positive' : 'text-muted'
                }`}>
                {doneCount} of {checklist.length} ready
              </Text>
            </View>

            <View className="bg-ink-raised rounded-card gap-3 p-4">
              {/* Progress before the list, so the card reads as movement
                  towards submitting rather than a tally of what is missing. */}
              <View className="bg-ink-high h-[4px] overflow-hidden rounded-full">
                <View
                  className={`h-full rounded-full ${ready ? 'bg-positive' : 'bg-violet'}`}
                  style={{ width: `${(doneCount / checklist.length) * 100}%` }}
                />
              </View>

              {checklist.map((item) => (
                <View key={item.label} className="flex-row items-center gap-3">
                  <Ionicons
                    name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={item.done ? Brand.positive : Brand.muted}
                  />
                  <Text
                    className={`font-outfit text-callout flex-1 ${
                      item.done ? 'text-fg' : 'text-muted'
                    }`}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>

            <View className="flex-row gap-2">
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/edit-release/[id]', params: { id: release.id } })
                }
                accessibilityRole="button"
                className="rounded-button border-line active:bg-ink-raised min-h-[52px] flex-1 items-center justify-center border py-4">
                <Text className="font-outfit-semibold text-body text-fg">Edit details</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/edit-tracks/[id]', params: { id: release.id } })
                }
                accessibilityRole="button"
                className="rounded-button border-line active:bg-ink-raised min-h-[52px] flex-1 items-center justify-center border py-4">
                <Text className="font-outfit-semibold text-body text-fg">Edit tracks</Text>
              </Pressable>
            </View>
          </Section>
        ) : null}

        <Section index={2}>
          <SectionHeading>TRACKS</SectionHeading>
          {release.tracks.length === 0 ? (
            <View className="bg-ink-raised rounded-card p-4">
              <Text className="font-outfit text-body text-muted">
                No tracks yet. Add them from Edit tracks.
              </Text>
            </View>
          ) : (
            release.tracks.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                playing={playingTrackId === track.id && playerStatus.playing}
                position={playerStatus.currentTime ?? 0}
                duration={playerStatus.duration ?? track.durationSec ?? 0}
                onPlay={() => void onPlayTrack(track)}
                onSeek={(seconds) => void player.seekTo(seconds)}
              />
            ))
          )}
        </Section>

        <Section index={3}>
          <SectionHeading>DETAILS</SectionHeading>
          <View className="bg-ink-raised rounded-card px-4 py-2">
            <Detail label="Primary genre" value={release.primaryGenre} />
            <Detail label="Secondary genre" value={release.secondaryGenre} />
            <Detail label="Language" value={release.language} />
            <Detail label="Release date" value={formatDate(release.releaseDate)} />
            <Detail label="© Line" value={release.cLine} />
            <Detail label="℗ Line" value={release.pLine} />
            {/* Assigned by the distribution partner, so null through Phase 1. */}
            <Detail label="UPC" value={release.upc ?? 'Assigned on release'} />
            {release.submittedAt ? (
              <Detail label="Submitted" value={formatDate(release.submittedAt)} />
            ) : null}
          </View>
        </Section>

        {editable ? (
          <Section index={4}>
            <Pressable
              onPress={onDelete}
              disabled={deleting}
              accessibilityRole="button"
              className="rounded-button border-danger-line active:bg-danger-surface mb-20 min-h-[52px] items-center justify-center border py-4">
              {deleting ? (
                <ActivityIndicator color={Brand.danger} />
              ) : (
                <Text className="font-outfit-semibold text-body text-danger">Delete release</Text>
              )}
            </Pressable>
          </Section>
        ) : null}
      </ScrollView>

      {/* Pinned. Submitting is the point of this screen, and it was previously
          buried between the rights tick and the track list. The rights tick
          comes with it — they are one action, not two. */}
      {editable ? (
        <View
          className="border-line-subtle bg-ink absolute right-0 bottom-0 left-0 gap-3 border-t px-4 pt-3"
          style={{ paddingBottom: insets.bottom + 12 }}>
          <Pressable
            onPress={() => setRightsConfirmed((value) => !value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: rightsConfirmed }}
            className="flex-row items-center gap-3">
            <View
              className={`h-[22px] w-[22px] items-center justify-center rounded-[6px] border-[1.5px] ${
                rightsConfirmed ? 'border-violet bg-violet' : 'border-line'
              }`}>
              {rightsConfirmed ? (
                <Text className="font-outfit-bold text-label text-white">✓</Text>
              ) : null}
            </View>
            <Text className="font-outfit text-label text-muted flex-1">
              I own or control the rights to this recording.
            </Text>
          </Pressable>

          <Pressable
            onPress={() => void onSubmit()}
            disabled={!ready || !rightsConfirmed || submitting}
            accessibilityRole="button"
            accessibilityState={{ disabled: !ready || !rightsConfirmed, busy: submitting }}
            className={`rounded-button min-h-[52px] items-center justify-center py-4 ${
              !ready || !rightsConfirmed || submitting
                ? 'bg-violet opacity-40'
                : 'bg-violet active:bg-violet-pressed'
            }`}>
            {submitting ? (
              <ActivityIndicator color={Brand.white} />
            ) : (
              <Text className="font-outfit-bold text-body text-white">
                {ready ? 'Submit for review' : `${checklist.length - doneCount} left to do`}
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
