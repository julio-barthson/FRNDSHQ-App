import { request } from '@/lib/api';

export type AssetKind = 'AUDIO' | 'ARTWORK' | 'AVATAR';

/**
 * Mirrors `publicView` in `media.service.ts`. The bucket and key deliberately
 * never leave the server, so a file's bytes are reached through
 * `GET /media/{id}/url` rather than a URL on this object.
 */
export interface MediaAsset {
  id: string;
  kind: AssetKind;
  mimeType: string | null;
  sizeBytes: number | null;
  status: string;
  createdAt: string;
  uploadedAt: string | null;
}

/** Only ever returns files that finished uploading. */
export function listMedia(kind?: AssetKind) {
  return request<MediaAsset[]>(`/media${kind ? `?kind=${kind}` : ''}`);
}
