import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, View } from 'react-native';

import { PlayButton, Scrubber } from '@/components/catalogue/track-player';
import { FormField, SelectField } from '@/components/ui/form-field';
import { EmptyAudio } from '@/components/ui/illustrations';
import { Brand } from '@/constants/brand';
import { creditSummary } from '@/features/catalogue/billing';
import { formatDuration, trackMeta } from '@/features/catalogue/detail';
import type { DetailTrack, TrackStatus } from '@/features/catalogue/types';
import { isPlayable } from '@/features/catalogue/use-track-player';
import type { TrackUpload } from '@/features/catalogue/use-track-uploads';

/** Matches the tones the release badge uses, so a status reads the same everywhere. */
const STATUS_STYLE: Record<TrackStatus, { label: string; box: string; text: string }> = {
  PENDING_UPLOAD: { label: 'No audio', box: 'border-line bg-ink-field', text: 'text-muted' },
  PROCESSING: { label: 'Checking', box: 'border-info-line bg-info-surface', text: 'text-info' },
  READY: {
    label: 'Ready',
    box: 'border-positive-line bg-positive-surface',
    text: 'text-positive',
  },
  FAILED: { label: 'Failed', box: 'border-danger-line bg-danger-surface', text: 'text-danger' },
};

function StatusChip({ status }: { status: TrackStatus }) {
  const tone = STATUS_STYLE[status];
  return (
    <View className={`rounded-full border px-2 py-[3px] ${tone.box}`}>
      <Text className={`font-outfit-medium text-caption ${tone.text}`}>{tone.label}</Text>
    </View>
  );
}

/** The percentage and bar, shown both in the open card and in the collapsed row. */
function UploadBar({ progress, compact = false }: { progress: number; compact?: boolean }) {
  return (
    <View className={compact ? 'gap-1' : 'gap-3'}>
      <View className="flex-row items-center justify-between">
        <Text className="font-outfit-medium text-caption text-fg">Uploading…</Text>
        <Text className="font-outfit-semibold text-caption text-blue-ink">
          {Math.round(progress * 100)}%
        </Text>
      </View>
      <View className="bg-ink-high h-[4px] overflow-hidden rounded-full">
        <View className="bg-blue h-full rounded-full" style={{ width: `${progress * 100}%` }} />
      </View>
    </View>
  );
}

/**
 * The audio half of a track.
 *
 * Four states, and each one has to say something different: nothing yet, a
 * transfer in flight, a file the server accepted, and a file it rejected with a
 * reason.
 *
 * The transfer itself is not run from here any more. It belongs to the release,
 * so that closing this card — which the edit screen does the moment another one
 * is opened — no longer tears down a running upload, and several masters can be
 * sent at once. See `useTrackUploads`.
 */
function AudioBlock({
  track,
  upload,
  onPick,
}: {
  track: DetailTrack;
  upload: TrackUpload | undefined;
  onPick: () => void;
}) {
  const uploading = upload != null && upload.error == null;

  if (uploading) {
    return (
      <View className="border-line bg-ink-field rounded-field gap-3 border p-4">
        <UploadBar progress={upload.progress} />
        <Text className="font-outfit text-caption text-muted">
          Keep the app open until it finishes. You can start the other tracks meanwhile.
        </Text>
      </View>
    );
  }

  const error = upload?.error ?? null;
  const meta = trackMeta(track);

  if (track.audioAssetId && track.status !== 'FAILED' && !error) {
    return (
      <View className="border-line bg-ink-field rounded-field flex-row items-center gap-3 border p-3">
        <View className="bg-ink-high h-[40px] w-[40px] items-center justify-center rounded-full">
          <Ionicons name="musical-notes" size={18} color={Brand.blueOnInk} />
        </View>

        <View className="flex-1 gap-1">
          <Text className="font-outfit-medium text-label text-fg">
            {formatDuration(track.durationSec) ?? 'Audio attached'}
          </Text>
          <Text className="font-outfit text-caption text-muted" numberOfLines={1}>
            {track.sampleRate ? `${Math.round(track.sampleRate / 1000)} kHz` : meta.text}
          </Text>
        </View>

        <Pressable
          onPress={onPick}
          accessibilityRole="button"
          accessibilityLabel="Replace audio"
          hitSlop={12}>
          <Text className="font-outfit-semibold text-label text-blue-ink">Replace</Text>
        </Pressable>
      </View>
    );
  }

  const failed = track.status === 'FAILED';

  return (
    <Pressable
      onPress={onPick}
      accessibilityRole="button"
      accessibilityLabel={failed || error ? 'Choose a different file' : 'Add audio'}
      className={`rounded-field active:bg-ink-high items-center gap-2 border border-dashed p-4 ${
        failed || error ? 'border-danger bg-danger-surface' : 'border-line bg-ink-field'
      }`}>
      <EmptyAudio size={80} />
      <Text className="font-outfit-semibold text-callout text-fg">
        {failed || error ? 'Choose a different file' : 'Add audio'}
      </Text>
      <Text
        className={`font-outfit text-caption text-center ${
          failed || error ? 'text-danger' : 'text-muted'
        }`}>
        {error ?? (failed ? track.processingError : null) ?? 'WAV, FLAC or MP3, up to 100MB.'}
      </Text>
    </Pressable>
  );
}

export function TrackCard({
  track,
  expanded,
  busy,
  canRemove,
  upload,
  playing,
  playerLoading,
  position,
  duration,
  onToggle,
  onRename,
  onVersion,
  onIsrc,
  onExplicit,
  onRemove,
  onPickAudio,
  onPlay,
  onSeek,
  onEditArtists,
  onEditCredits,
  inheritedArtist,
}: {
  track: DetailTrack;
  expanded: boolean;
  busy: boolean;
  canRemove: boolean;
  upload: TrackUpload | undefined;
  playing: boolean;
  playerLoading: boolean;
  position: number;
  duration: number;
  onToggle: () => void;
  onRename: (title: string) => void;
  onVersion: (versionTitle: string) => void;
  onIsrc: (isrc: string) => void;
  onExplicit: (explicit: boolean) => void;
  onRemove: () => void;
  onPickAudio: () => void;
  onPlay: () => void;
  onSeek: (seconds: number) => void;
  onEditArtists: () => void;
  onEditCredits: () => void;
  /** The release's billing, which a track with none of its own inherits. */
  inheritedArtist: string;
}) {
  const [title, setTitle] = useState(track.title);
  const [versionTitle, setVersionTitle] = useState(track.versionTitle ?? '');
  const [isrc, setIsrc] = useState(track.isrc ?? '');

  const uploading = upload != null && upload.error == null;
  const playable = isPlayable(track);

  return (
    <View className="bg-ink-raised rounded-card overflow-hidden">
      <View className="flex-row items-center">
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          className="active:bg-ink-high flex-1 flex-row items-center gap-3 p-3">
          <View className="bg-ink-high h-[36px] w-[36px] items-center justify-center rounded-full">
            <Text className="font-outfit-semibold text-label text-muted">{track.trackNumber}</Text>
          </View>

          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-2">
              <Text className="font-outfit-semibold text-body text-fg flex-1" numberOfLines={1}>
                {/* The composed string, not the raw title — it is what stores
                    will print, and the artist should be looking at that. */}
                {track.displayTitle}
              </Text>
              {track.explicit ? (
                <View className="bg-ink-high rounded-[4px] px-1" accessibilityLabel="Explicit">
                  <Text className="font-outfit-bold text-caption text-muted">E</Text>
                </View>
              ) : null}
            </View>

            {/* A transfer running behind a closed card would otherwise be
                invisible, which is the whole reason uploads moved up a level. */}
            {uploading ? (
              <UploadBar progress={upload.progress} compact />
            ) : (
              <View className="flex-row items-center gap-2">
                <StatusChip status={track.status} />
                {track.durationSec ? (
                  <Text className="font-outfit text-caption text-muted">
                    {formatDuration(track.durationSec)}
                  </Text>
                ) : null}
              </View>
            )}
          </View>
        </Pressable>

        {/* Outside the toggle: listening back is not the same action as opening
            the form, and an artist checking they uploaded the right master
            should not have to expand a card to hear it. */}
        {playable && !uploading ? (
          <PlayButton
            playing={playing}
            loading={playerLoading}
            label={track.title}
            size={36}
            onPress={onPlay}
          />
        ) : null}

        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Collapse' : 'Edit track'}
          hitSlop={8}
          className="px-3 py-4">
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Brand.muted} />
        </Pressable>
      </View>

      {playing ? (
        <View className="px-3 pb-3">
          <Scrubber position={position} duration={duration} onSeek={onSeek} />
        </View>
      ) : null}

      {expanded ? (
        <View className="border-line-subtle gap-4 border-t p-4">
          <FormField
            label="Track title"
            value={title}
            onChangeText={setTitle}
            onBlur={() => {
              // Saved on blur rather than per keystroke — this screen writes
              // straight to the API, and a request per character is absurd.
              if (title.trim() && title.trim() !== track.title) onRename(title.trim());
            }}
            placeholder="What is it called?"
            maxCount={200}
            editable={!busy}
          />

          <SelectField
            label="Artists"
            value={track.displayArtist || null}
            placeholder={inheritedArtist || 'Who is this by?'}
            hint={
              track.contributors.length === 0
                ? 'Credited to the release. Set this only if the track differs.'
                : undefined
            }
            disabled={busy}
            onPress={onEditArtists}
          />

          {/* Below Artists, deliberately: the order on screen is the order the
              two get confused in. Billing first, then the people who are not
              on the cover. */}
          <SelectField
            label="Credits"
            value={creditSummary(track.contributors) || null}
            placeholder="Producer, songwriter, engineer"
            hint={
              creditSummary(track.contributors)
                ? undefined
                : 'Optional. Songwriter and composer are what publishing royalties match on.'
            }
            disabled={busy}
            onPress={onEditCredits}
          />

          <FormField
            label="ISRC"
            value={isrc}
            onChangeText={setIsrc}
            onBlur={() => {
              if (isrc.trim().toUpperCase() !== (track.isrc ?? ''))
                onIsrc(isrc.trim().toUpperCase());
            }}
            placeholder="Leave empty and one will be assigned"
            hint="Only if this recording already has one. It identifies the recording for royalties."
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={20}
            editable={!busy}
          />

          <FormField
            label="Version"
            value={versionTitle}
            onChangeText={setVersionTitle}
            onBlur={() => {
              if (versionTitle.trim() !== (track.versionTitle ?? ''))
                onVersion(versionTitle.trim());
            }}
            placeholder="Radio Edit, Live, Instrumental…"
            hint="Only if this is a version of the original."
            maxCount={200}
            editable={!busy}
          />

          <View className="flex-row items-center justify-between gap-4">
            <View className="flex-1">
              <Text className="font-outfit-semibold text-label text-fg">Explicit content</Text>
              <Text className="font-outfit text-caption text-muted">
                Every store requires this per track.
              </Text>
            </View>
            <Switch
              value={track.explicit}
              onValueChange={onExplicit}
              disabled={busy}
              // Prop-shaped: `className` reaches none of a Switch's colours.
              trackColor={{ false: Brand.inkHigh, true: Brand.blue }}
              thumbColor={Brand.white}
            />
          </View>

          <View className="gap-2">
            <Text className="font-outfit-semibold text-label text-fg">Audio</Text>
            <AudioBlock track={track} upload={upload} onPick={onPickAudio} />
          </View>

          {canRemove ? (
            <Pressable
              onPress={onRemove}
              disabled={busy || uploading}
              accessibilityRole="button"
              className="rounded-button border-danger-line active:bg-danger-surface min-h-[44px] items-center justify-center border py-3">
              {busy ? (
                <ActivityIndicator color={Brand.danger} />
              ) : (
                <Text className="font-outfit-semibold text-callout text-danger">Remove track</Text>
              )}
            </Pressable>
          ) : (
            <Text className="font-outfit text-caption text-muted text-center">
              A release keeps at least one track. To start over, delete the release instead.
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}
