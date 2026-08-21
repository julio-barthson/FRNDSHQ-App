import type { DetailTrack, ReleaseDetail, ReleaseStatus } from '@/features/catalogue/types';

export interface ChecklistItem {
  label: string;
  done: boolean;
}

/**
 * Mirrors what the API checks on submit, so the artist sees the blockers
 * before tapping rather than as a rejection afterwards.
 *
 * The server remains the authority — it returns the same list as an array of
 * `details` if this one is out of date, and the screen shows every entry.
 */
export function submissionChecklist(release: ReleaseDetail): ChecklistItem[] {
  const missingAudio = release.tracks.filter((t) => !t.audioAssetId).length;
  const failed = release.tracks.filter((t) => t.status === 'FAILED').length;
  const processing = release.tracks.filter(
    (t) => t.audioAssetId && t.status !== 'READY' && t.status !== 'FAILED'
  ).length;

  return [
    { label: 'Cover artwork added', done: Boolean(release.artworkAssetId) },
    { label: 'Primary genre set', done: Boolean(release.primaryGenre) },
    { label: 'At least one track', done: release.tracks.length > 0 },
    {
      label:
        missingAudio > 0
          ? `Audio for every track (${missingAudio} missing)`
          : failed > 0
            ? `${failed} track${failed === 1 ? '' : 's'} failed checks`
            : processing > 0
              ? `${processing} track${processing === 1 ? '' : 's'} still processing`
              : 'Audio for every track',
      done: release.tracks.length > 0 && release.tracks.every((t) => t.status === 'READY'),
    },
  ];
}

/** Only `DRAFT` and `REJECTED` accept changes; submitting locks the release. */
export function isEditable(status: ReleaseStatus): boolean {
  return status === 'DRAFT' || status === 'REJECTED';
}

export function formatDuration(seconds: number | null): string | null {
  if (seconds == null) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** The one-line summary under a track title, and whether it reads as a problem. */
export function trackMeta(track: DetailTrack): { text: string; bad: boolean } {
  switch (track.status) {
    case 'READY': {
      const duration = formatDuration(track.durationSec);
      // ISRC is assigned downstream, so say so rather than leave a blank an
      // artist might read as something they forgot to fill in.
      const isrc = track.isrc ?? 'ISRC assigned on release';
      return { text: [duration, isrc].filter(Boolean).join(' · '), bad: false };
    }
    case 'PROCESSING':
      return { text: 'Checking audio…', bad: false };
    case 'FAILED':
      return { text: track.processingError ?? 'Audio check failed', bad: true };
    default:
      return { text: 'No audio yet', bad: false };
  }
}

/**
 * Total runtime across a release's tracks.
 *
 * Computed client-side from the list response, which already carries
 * `durationSec` per track — no extra request for it. Null while any track is
 * still missing a duration, because a partial total under-reports the release
 * and an artist would read it as the real length.
 */
export function totalRuntime(tracks: { durationSec: number | null }[]): string | null {
  if (tracks.length === 0) return null;
  if (tracks.some((track) => track.durationSec == null)) return null;

  const seconds = tracks.reduce((sum, track) => sum + (track.durationSec ?? 0), 0);
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);

  return hours > 0
    ? `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    : `${mins}:${secs.toString().padStart(2, '0')}`;
}
