import type { ReleaseStatus, ReleaseSummary } from '@/features/catalogue/types';

export interface AttentionItem {
  releaseId: string;
  releaseTitle: string;
  /** Short enough to sit on one line in a card. */
  message: string;
  /** Drives ordering and colour; `blocking` is the artist's turn to act. */
  tone: 'urgent' | 'blocking';
}

export interface Summary {
  /** Editable: `DRAFT` and `REJECTED` are the only statuses that accept changes. */
  drafts: number;
  /** Handed over and out of the artist's control. */
  submitted: number;
  total: number;
}

const SUBMITTED: ReleaseStatus[] = ['SUBMITTED', 'IN_REVIEW'];

/**
 * Two counts, deliberately.
 *
 * There was a third, `approved`, counting `READY` releases — but no endpoint
 * moves a release out of `SUBMITTED` while admin review does not exist, so it
 * was structurally always zero. A dashboard reporting a pipeline that cannot
 * advance reads as a broken app, so the number is not shown at all rather than
 * shown as a permanent nought.
 *
 * `submitted` is reported plainly and promises nothing about what happens next.
 */
export function summarise(releases: ReleaseSummary[]): Summary {
  return {
    drafts: releases.filter((r) => r.status === 'DRAFT' || r.status === 'REJECTED').length,
    submitted: releases.filter((r) => SUBMITTED.includes(r.status)).length,
    total: releases.length,
  };
}

/** Only these can be opened and changed, so only these are worth linking to. */
export function inProgress(releases: ReleaseSummary[]): ReleaseSummary[] {
  return releases.filter((r) => r.status === 'DRAFT' || r.status === 'REJECTED');
}

/**
 * What the artist has to act on, most pressing first.
 *
 * Derived from the list response alone, which is why it covers artwork, audio
 * and review outcomes but not the missing primary genre — `GET /releases` does
 * not return genres, and fetching every release in full to find out would cost
 * a request per row for one line of copy.
 */
export function attentionItems(releases: ReleaseSummary[]): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const release of releases) {
    // A rejected release is the only thing waiting on nobody but the artist,
    // with a deadline set by whoever reviewed it — so it always sorts first.
    if (release.status === 'REJECTED') {
      items.push({
        releaseId: release.id,
        releaseTitle: release.title,
        message: 'Came back with notes',
        tone: 'urgent',
      });
      continue;
    }

    // Anything already submitted is out of the artist's hands.
    if (release.status !== 'DRAFT') continue;

    const failed = release.tracks.filter((t) => t.status === 'FAILED').length;
    if (failed > 0) {
      items.push({
        releaseId: release.id,
        releaseTitle: release.title,
        message: `${failed} track${failed === 1 ? '' : 's'} failed audio checks`,
        tone: 'urgent',
      });
      continue;
    }

    const missingAudio = release.tracks.filter((t) => t.status === 'PENDING_UPLOAD').length;
    if (missingAudio > 0) {
      items.push({
        releaseId: release.id,
        releaseTitle: release.title,
        message: `${missingAudio} track${missingAudio === 1 ? '' : 's'} need audio`,
        tone: 'blocking',
      });
      continue;
    }

    if (!release.artworkUrl) {
      items.push({
        releaseId: release.id,
        releaseTitle: release.title,
        message: 'Needs cover artwork',
        tone: 'blocking',
      });
    }
  }

  return items.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === 'urgent' ? -1 : 1));
}
