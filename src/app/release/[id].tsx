import Ionicons from '@expo/vector-icons/Ionicons';
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
import { PlayButton, Scrubber } from '@/components/catalogue/track-player';
import { ActionSheet, type SheetAction } from '@/components/ui/action-sheet';
import { BackdropScrim, Glow } from '@/components/ui/illustrations';
import { ScreenHeader, useScrolledPast } from '@/components/ui/screen-header';
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
import { isPlayable, useTrackPlayer } from '@/features/catalogue/use-track-player';
import { ApiError } from '@/lib/api';

const TYPE_LABEL: Record<ReleaseDetail['type'], string> = {
  SINGLE: 'Single',
  EP: 'EP',
  ALBUM: 'Album',
};

/** Sections drift up in sequence rather than all snapping in at once. */
function Section({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(340)} className="my-2 gap-2">
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

function TrackRow({
  track,
  playing,
  loading,
  position,
  duration,
  onPlay,
  onSeek,
}: {
  track: DetailTrack;
  playing: boolean;
  loading: boolean;
  position: number;
  duration: number;
  onPlay: () => void;
  onSeek: (seconds: number) => void;
}) {
  const meta = trackMeta(track);
  const playable = isPlayable(track);

  return (
    <View className="bg-ink-raised rounded-card flex-row items-center gap-3 p-3">
      <View className="bg-ink-high h-[36px] w-[36px] items-center justify-center rounded-full">
        <Text className="font-outfit-semibold text-label text-muted">{track.trackNumber}</Text>
      </View>

      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <Text className="font-outfit-semibold text-body text-fg flex-1" numberOfLines={1}>
            {track.displayTitle}
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
        <PlayButton playing={playing} loading={loading} label={track.title} onPress={onPlay} />
      ) : null}
    </View>
  );
}

export default function ReleaseDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // `created` is set once, by the new-release screen, and never appears on a
  // release opened from the list.
  const { id, created } = useLocalSearchParams<{ id: string; created?: string }>();

  const [release, setRelease] = useState<ReleaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [nextStepsOpen, setNextStepsOpen] = useState(created === '1');
  const [submittedOpen, setSubmittedOpen] = useState(false);

  const { scrolled, onScroll } = useScrolledPast(200);

  const load = useCallback(async () => {
    try {
      setRelease(await getRelease(id));
      setError(null);
    } catch (caught) {
      // Another artist's release reads as missing rather than forbidden.
      setError(caught instanceof ApiError ? caught.message : 'Could not load this release.');
    }
  }, [id]);

  // Playback URLs are presigned and short-lived. Rather than tracking their
  // age, the release is fetched again at the moment play is pressed, which
  // produces a fresh URL and refreshes the screen in the same step.
  const player = useTrackPlayer(
    useCallback(
      async (trackId: string) => {
        const fresh = await getRelease(id);
        setRelease(fresh);
        return fresh.tracks.find((candidate) => candidate.id === trackId)?.audioUrl ?? null;
      },
      [id]
    )
  );

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

  async function onSubmit() {
    if (!release || submitting) return;

    // The screen is about to become read-only; a transport left running over
    // a locked release is confusing.
    player.stop();

    setSubmitting(true);
    setActionError(null);
    try {
      setRelease(await submitRelease(release.id));
      // Submitting is the end of the artist's work and the start of a wait
      // nothing else on the screen explains. Saying what happens next, and how
      // long it takes, is the difference between a queue and a silence.
      setSubmittedOpen(true);
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
      <View className="bg-ink flex-1">
        <ScreenHeader onPress={() => router.back()} />
        <View className="gap-4 px-4">
          {error ? (
            <AuthAlert messages={[error]} onRetry={() => void load()} />
          ) : (
            <ActivityIndicator color={Brand.blueOnInk} />
          )}
        </View>
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

  const footerHeight = editable ? 120 + insets.bottom : 24;

  // The same checklist the card below shows, read as things to go and do. Only
  // what is still outstanding is offered, and a release that needs nothing gets
  // the sheet's own copy instead of a list of ticks.
  const nextSteps: SheetAction[] = [
    {
      icon: 'image',
      label: 'Add cover artwork',
      hint: '3000 x 3000, JPEG or PNG',
      done: Boolean(release.artworkAssetId),
      onPress: () => {
        setNextStepsOpen(false);
        router.push({ pathname: '/edit-release/[id]', params: { id: release.id } });
      },
    },
    {
      icon: 'musical-notes',
      label: release.tracks.length === 1 ? 'Upload your master' : 'Upload your masters',
      hint: 'WAV, FLAC or MP3, up to 100MB each',
      done: release.tracks.length > 0 && release.tracks.every((track) => track.audioAssetId),
      onPress: () => {
        setNextStepsOpen(false);
        router.push({ pathname: '/edit-tracks/[id]', params: { id: release.id } });
      },
    },
    {
      icon: 'people',
      label: 'Say who it is by',
      hint: 'Main artists, and anyone featured',
      done: release.contributors.some((row) => row.role === 'PRIMARY_ARTIST'),
      onPress: () => {
        setNextStepsOpen(false);
        router.push({ pathname: '/edit-release/[id]', params: { id: release.id } });
      },
    },
    {
      icon: 'pricetag',
      label: 'Set the genre and release date',
      hint: 'Stores need a genre before this can go out',
      done: Boolean(release.primaryGenre),
      onPress: () => {
        setNextStepsOpen(false);
        router.push({ pathname: '/edit-release/[id]', params: { id: release.id } });
      },
    },
  ];

  const outstanding = nextSteps.filter((step) => !step.done);

  // No horizontal padding on the root. The blurred cover and the pinned header
  // are both absolute children of it, so the 8px that used to be there inset
  // the header's ground and left a strip of artwork showing down either side.
  // The scroll content carries its own `px-4` regardless, which is the padding
  // every other screen uses.
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
          <View className="bg-blue-surface absolute inset-0" />
        )}
        <View className="absolute inset-0">
          <BackdropScrim />
        </View>
      </View>

      {/* Outside the scroll view, so it stays put. Back used to be the first
          thing in the content, which meant that on a long release the only way
          off the screen was to flick all the way back to the top for it. */}
      <ScreenHeader
        floating
        scrolled={scrolled}
        title={release.title}
        subtitle={meta}
        onPress={() => router.back()}
      />

      <ScrollView
        // One style prop, no class list. Both insets are dynamic so they cannot
        // be classes, and react-native-css overwrites rather than merges when a
        // `contentContainerStyle` meets a `contentContainerClassName` — the gap
        // and the side padding were being thrown away by the style sitting next
        // to them.
        contentContainerStyle={{
          gap: 24,
          paddingHorizontal: 16,
          // Clears the pinned header, which is out of the flow above this.
          paddingTop: insets.top + 72,
          paddingBottom: footerHeight,
        }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}>
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
            {/* The composed string rather than the raw title. A feature lives in
                the metadata, and this is where the artist sees what that
                actually produces. */}
            <Text className="font-outfit-bold text-title text-fg text-center">
              {release.displayTitle}
            </Text>
            {release.displayArtist ? (
              <Text className="font-outfit-semibold text-callout text-blue-ink text-center">
                {release.displayArtist}
              </Text>
            ) : null}
            <Text className="font-outfit text-callout text-muted">{meta}</Text>
            <StatusBadge status={release.status} />
            {explainer ? (
              <Text className="font-outfit text-label text-muted">{explainer}</Text>
            ) : null}
          </View>
        </View>

        <AuthAlert messages={[actionError, player.error]} />

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
                  className={`h-full rounded-full ${ready ? 'bg-positive' : 'bg-blue'}`}
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
                playing={player.playingId === track.id && player.playing}
                loading={player.loadingId === track.id}
                position={player.position}
                duration={player.duration || (track.durationSec ?? 0)}
                onPlay={() => void player.toggle(track)}
                onSeek={player.seek}
              />
            ))
          )}
        </Section>

        <Section index={3}>
          <SectionHeading>DETAILS</SectionHeading>
          <View className="bg-ink-raised rounded-card mb-4 px-4 py-2">
            <Detail label="Artists" value={release.displayArtist || null} />
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
              className="rounded-button border-danger-line active:bg-danger-surface mb-2 min-h-[52px] items-center justify-center border py-4">
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
                rightsConfirmed ? 'border-blue bg-blue' : 'border-line'
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
                ? 'bg-blue opacity-40'
                : 'bg-blue active:bg-blue-pressed'
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

      <ActionSheet
        visible={nextStepsOpen}
        eyebrow="RELEASE CREATED"
        title={outstanding.length > 0 ? "Here's what's left" : `${release.title} is ready`}
        body={
          outstanding.length > 0
            ? 'Nothing is sent anywhere until you submit it, so you can do these in any order and come back whenever.'
            : 'Everything we need is on it. Confirm the rights at the bottom of this page and send it for review.'
        }
        actions={outstanding}
        dismissLabel={outstanding.length > 0 ? "I'll do this later" : 'Take me to it'}
        onClose={() => setNextStepsOpen(false)}
      />

      <ActionSheet
        visible={submittedOpen}
        eyebrow="SUBMITTED"
        tone="positive"
        title="It's with us"
        body={`${release.title} is in the review queue. We check the audio, the artwork and the metadata against what stores accept — usually within two working days. You'll be told either way, and if anything needs changing you'll get the reason and the release will reopen for editing. It stays locked until then.`}
        dismissLabel="Got it"
        onClose={() => setSubmittedOpen(false)}
      />
    </View>
  );
}
