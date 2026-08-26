import { request } from '@/lib/api';
import type {
  CreateReleaseInput,
  ReleaseDetail,
  ReleasePage,
  ReleaseQuery,
  UpdateReleaseInput,
  UpdateTrackInput,
} from '@/features/catalogue/types';

function queryString(query: ReleaseQuery): string {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.artistId) params.set('artistId', query.artistId);
  if (query.search?.trim()) params.set('search', query.search.trim());
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));

  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

/**
 * `GET /releases`, scoped server-side to the caller's own artist — a release
 * belonging to anyone else reads as missing rather than forbidden.
 */
export function listReleases(query: ReleaseQuery = {}) {
  return request<ReleasePage>(`/releases${queryString(query)}`);
}

/**
 * `POST /releases`. Tracks may be created without audio — the API allows a
 * draft to exist before any file has been uploaded — so this is the whole
 * metadata step on its own.
 */
export function createRelease(input: CreateReleaseInput) {
  return request<{ id: string; title: string }>('/releases', {
    method: 'POST',
    body: input,
  });
}

/** `GET /releases/{id}`. Someone else's id reads as missing, not forbidden. */
export function getRelease(id: string) {
  return request<ReleaseDetail>(`/releases/${id}`);
}

/** Attaches confirmed cover artwork to a draft. */
export function setReleaseArtwork(releaseId: string, artworkAssetId: string) {
  return request<ReleaseDetail>(`/releases/${releaseId}`, {
    method: 'PATCH',
    body: { artworkAssetId },
  });
}

/**
 * Attaches confirmed audio to a track. The server starts validation from here,
 * so the track moves to PROCESSING and reaches READY or FAILED on its own.
 *
 * Like every track endpoint, this returns the whole release rather than the
 * track — `TracksService.reload` — so a caller can re-render from the reply
 * instead of fetching again.
 */
export function setTrackAudio(releaseId: string, trackId: string, audioAssetId: string) {
  return request<ReleaseDetail>(`/releases/${releaseId}/tracks/${trackId}`, {
    method: 'PATCH',
    body: { audioAssetId },
  });
}

/** `PATCH /releases/{id}`. Only accepted while the release is a draft. */
export function updateRelease(id: string, input: UpdateReleaseInput) {
  return request<ReleaseDetail>(`/releases/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

/**
 * `POST /releases/{id}/tracks`. Rejected on a SINGLE — the release has to be
 * an EP or album first, which {@link updateRelease} can do.
 */
export function addTrack(releaseId: string, title: string) {
  return request<ReleaseDetail>(`/releases/${releaseId}/tracks`, {
    method: 'POST',
    body: { title },
  });
}

export function updateTrack(releaseId: string, trackId: string, input: UpdateTrackInput) {
  return request<ReleaseDetail>(`/releases/${releaseId}/tracks/${trackId}`, {
    method: 'PATCH',
    body: input,
  });
}

/** Refused when it would leave the release with no tracks. */
export function removeTrack(releaseId: string, trackId: string) {
  return request<ReleaseDetail>(`/releases/${releaseId}/tracks/${trackId}`, {
    method: 'DELETE',
  });
}

/**
 * `PATCH /releases/{id}/tracks/order`. Takes every track id in its new order —
 * the API rejects a partial list rather than guessing what the rest should be.
 */
export function reorderTracks(releaseId: string, trackIds: string[]) {
  return request<ReleaseDetail>(`/releases/${releaseId}/tracks/order`, {
    method: 'PATCH',
    body: { trackIds },
  });
}

/**
 * `POST /releases/{id}/submit`.
 *
 * `confirmRights` must be true — it is the artist's rights claim, and the
 * server stores the moment it was made. Submitting also locks the release:
 * only a review sending it back to REJECTED reopens editing.
 */
export function submitRelease(id: string) {
  return request<ReleaseDetail>(`/releases/${id}/submit`, {
    method: 'POST',
    body: { confirmRights: true },
  });
}

/** `DELETE /releases/{id}`. Only a draft or a rejected release can be removed. */
export function deleteRelease(id: string) {
  return request<{ message: string }>(`/releases/${id}`, { method: 'DELETE' });
}
