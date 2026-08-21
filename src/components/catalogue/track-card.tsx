import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, View } from 'react-native';

import { FormField } from '@/components/ui/form-field';
import { EmptyAudio } from '@/components/ui/illustrations';
import { Brand } from '@/constants/brand';
import { setTrackAudio } from '@/features/catalogue/api';
import { formatDuration, trackMeta } from '@/features/catalogue/detail';
import { pickAudio } from '@/features/catalogue/pick-audio';
import type { DetailTrack, TrackStatus } from '@/features/catalogue/types';
import { checkFile, uploadFile } from '@/features/catalogue/upload';
import { ApiError } from '@/lib/api';

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

/**
 * The audio half of a track.
 *
 * Four states, and each one has to say something different: nothing yet, a
 * transfer in flight, a file the server accepted, and a file it rejected with a
 * reason. A master runs to 100MB, so the transfer state carries a real
 * percentage — a bare spinner on a two-minute upload reads as a frozen screen.
 */
function AudioBlock({
  releaseId,
  track,
  onChanged,
}: {
  releaseId: string;
  track: DetailTrack;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function onPick() {
    if (busy) return;

    setError(null);
    try {
      const file = await pickAudio();
      if (!file) return;

      // Fails fast on type and size rather than spending a 100MB upload to
      // find out; the server re-checks all of it regardless.
      const rejection = checkFile('AUDIO', file);
      if (rejection) {
        setError(rejection);
        return;
      }

      setBusy(true);
      setProgress(0);
      const { assetId } = await uploadFile('AUDIO', file, setProgress);
      await setTrackAudio(releaseId, track.id, assetId);
      onChanged();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Could not upload that file. Try again.'
      );
    } finally {
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <View className="border-line bg-ink-field rounded-field gap-3 border p-4">
        <View className="flex-row items-center justify-between">
          <Text className="font-outfit-medium text-label text-fg">Uploading…</Text>
          <Text className="font-outfit-semibold text-label text-violet-ink">
            {Math.round(progress * 100)}%
          </Text>
        </View>
        <View className="bg-ink-high h-[4px] overflow-hidden rounded-full">
          <View className="bg-violet h-full rounded-full" style={{ width: `${progress * 100}%` }} />
        </View>
        <Text className="font-outfit text-caption text-muted">
          Keep this screen open until it finishes.
        </Text>
      </View>
    );
  }

  const meta = trackMeta(track);

  if (track.audioAssetId && track.status !== 'FAILED') {
    return (
      <View className="border-line bg-ink-field rounded-field flex-row items-center gap-3 border p-3">
        <View className="bg-ink-high h-[40px] w-[40px] items-center justify-center rounded-full">
          <Ionicons name="musical-notes" size={18} color={Brand.violetInk} />
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
          onPress={() => void onPick()}
          accessibilityRole="button"
          accessibilityLabel="Replace audio"
          hitSlop={12}>
          <Text className="font-outfit-semibold text-label text-violet-ink">Replace</Text>
        </Pressable>
      </View>
    );
  }

  const failed = track.status === 'FAILED';

  return (
    <Pressable
      onPress={() => void onPick()}
      accessibilityRole="button"
      accessibilityLabel={failed ? 'Choose a different file' : 'Add audio'}
      className={`rounded-field active:bg-ink-high items-center gap-2 border border-dashed p-4 ${
        failed || error ? 'border-danger bg-danger-surface' : 'border-line bg-ink-field'
      }`}>
      <EmptyAudio size={80} />
      <Text className="font-outfit-semibold text-callout text-fg">
        {failed ? 'Choose a different file' : 'Add audio'}
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
  releaseId,
  track,
  expanded,
  busy,
  canRemove,
  onToggle,
  onRename,
  onVersion,
  onExplicit,
  onRemove,
  onChanged,
}: {
  releaseId: string;
  track: DetailTrack;
  expanded: boolean;
  busy: boolean;
  canRemove: boolean;
  onToggle: () => void;
  onRename: (title: string) => void;
  onVersion: (versionTitle: string) => void;
  onExplicit: (explicit: boolean) => void;
  onRemove: () => void;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState(track.title);
  const [versionTitle, setVersionTitle] = useState(track.versionTitle ?? '');

  return (
    <View className="bg-ink-raised rounded-card overflow-hidden">
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        className="active:bg-ink-high flex-row items-center gap-3 p-3">
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
              <View className="bg-ink-high rounded-[4px] px-1" accessibilityLabel="Explicit">
                <Text className="font-outfit-bold text-caption text-muted">E</Text>
              </View>
            ) : null}
          </View>

          <View className="flex-row items-center gap-2">
            <StatusChip status={track.status} />
            {track.durationSec ? (
              <Text className="font-outfit text-caption text-muted">
                {formatDuration(track.durationSec)}
              </Text>
            ) : null}
          </View>
        </View>

        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Brand.muted} />
      </Pressable>

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
              trackColor={{ false: Brand.inkHigh, true: Brand.violet }}
              thumbColor={Brand.white}
            />
          </View>

          <View className="gap-2">
            <Text className="font-outfit-semibold text-label text-fg">Audio</Text>
            <AudioBlock releaseId={releaseId} track={track} onChanged={onChanged} />
          </View>

          {canRemove ? (
            <Pressable
              onPress={onRemove}
              disabled={busy}
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
