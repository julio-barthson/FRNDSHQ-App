import { useCallback, useRef, useState } from 'react';

import { setTrackAudio } from '@/features/catalogue/api';
import { pickAudio } from '@/features/catalogue/pick-audio';
import { checkFile, uploadFile } from '@/features/catalogue/upload';
import { ApiError } from '@/lib/api';

export interface TrackUpload {
  /** Fraction sent, 0 to 1. */
  progress: number;
  error: string | null;
}

/**
 * Every audio upload on a release, running side by side.
 *
 * This state used to live inside the card that started it, which made two
 * things impossible at once. Only one card can be open on the edit screen, so
 * collapsing the one that was uploading tore its progress down mid-transfer —
 * the bytes kept going, but the artist had no way to see it. And starting a
 * second upload meant closing the first, so a twelve-track album was twelve
 * uploads queued behind each other by the interface rather than by any real
 * limit.
 *
 * Holding it a level up fixes both. An upload belongs to the release, not to
 * whichever card happens to be open, so an album can send every master at once
 * and each card shows its own progress whenever it is looked at.
 */
export function useTrackUploads(releaseId: string, onUploaded: () => void) {
  const [uploads, setUploads] = useState<Record<string, TrackUpload>>({});
  // Read inside `start` to reject a double-tap without making `start` depend on
  // the state it writes, which would rebuild the callback on every progress tick.
  const running = useRef(new Set<string>()).current;

  const patch = useCallback((trackId: string, next: Partial<TrackUpload>) => {
    setUploads((current) => {
      // The index signature types this as always present, so the fallback has
      // to be written out rather than spread — TypeScript would otherwise read
      // the defaults as dead.
      const existing: TrackUpload = current[trackId] ?? { progress: 0, error: null };
      return { ...current, [trackId]: { ...existing, ...next } };
    });
  }, []);

  const forget = useCallback((trackId: string) => {
    setUploads((current) => {
      if (!(trackId in current)) return current;
      const next = { ...current };
      delete next[trackId];
      return next;
    });
  }, []);

  const start = useCallback(
    async (trackId: string) => {
      if (running.has(trackId)) return;

      forget(trackId);

      let file;
      try {
        file = await pickAudio();
      } catch {
        patch(trackId, { error: 'Could not open the file browser.' });
        return;
      }
      if (!file) return;

      // Fails fast on type and size rather than spending a 100MB upload to find
      // out; the server re-checks all of it regardless.
      const rejection = checkFile('AUDIO', file);
      if (rejection) {
        patch(trackId, { error: rejection });
        return;
      }

      running.add(trackId);
      patch(trackId, { progress: 0, error: null });

      try {
        const { assetId } = await uploadFile('AUDIO', file, (progress) =>
          patch(trackId, { progress })
        );
        await setTrackAudio(releaseId, trackId, assetId);
        forget(trackId);
        // Server-side validation starts here, so the release is refetched to
        // pick up the track's move to PROCESSING.
        onUploaded();
      } catch (caught) {
        patch(trackId, {
          error:
            caught instanceof ApiError ? caught.message : 'Could not upload that file. Try again.',
        });
      } finally {
        running.delete(trackId);
      }
    },
    [releaseId, onUploaded, patch, forget, running]
  );

  const activeCount = Object.values(uploads).filter((upload) => !upload.error).length;

  return { uploads, start, dismissError: forget, activeCount };
}
