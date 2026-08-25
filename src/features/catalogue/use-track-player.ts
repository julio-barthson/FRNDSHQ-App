import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCallback, useEffect, useState } from 'react';

import type { DetailTrack } from '@/features/catalogue/types';

/** Nothing is playable until the server has finished checking the file. */
export function isPlayable(track: DetailTrack): boolean {
  return Boolean(track.audioUrl) && track.status === 'READY';
}

/**
 * One transport, shared by every screen that lists tracks.
 *
 * Playback URLs are presigned and short-lived, so rather than tracking how old
 * one is, `resolveUrl` is asked for a fresh one at the moment play is pressed.
 * That callback is also how the calling screen keeps the release it is showing
 * up to date, since fetching one is what produces the new URL.
 */
export function useTrackPlayer(resolveUrl: (trackId: string) => Promise<string | null>) {
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Without this a master is silent on an iPhone with the ringer switch off,
  // which reads as a broken upload rather than a muted phone.
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  const stop = useCallback(() => {
    player.pause();
    setPlayingId(null);
  }, [player]);

  const toggle = useCallback(
    async (track: DetailTrack) => {
      if (playingId === track.id) {
        player.pause();
        setPlayingId(null);
        return;
      }

      if (!isPlayable(track) || loadingId) return;

      setError(null);
      setLoadingId(track.id);
      try {
        const url = await resolveUrl(track.id);
        if (!url) {
          setError('That track is no longer playable. Reopen the release to refresh it.');
          return;
        }

        player.replace({ uri: url });
        player.play();
        setPlayingId(track.id);
      } catch {
        setError('Could not start playback. Please try again.');
      } finally {
        setLoadingId(null);
      }
    },
    [player, playingId, loadingId, resolveUrl]
  );

  const seek = useCallback((seconds: number) => void player.seekTo(seconds), [player]);

  return {
    playingId,
    loadingId,
    /** True only while sound is actually coming out — paused counts as not playing. */
    playing: playingId !== null && status.playing,
    position: status.currentTime ?? 0,
    duration: status.duration ?? 0,
    toggle,
    seek,
    stop,
    error,
    clearError: useCallback(() => setError(null), []),
  };
}
