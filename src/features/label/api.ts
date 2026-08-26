import type {
  RosterArtist,
  RosterArtistInput,
  RosterArtistSummary,
} from '@/features/label/types';
import { request } from '@/lib/api';

/**
 * `GET /label/artists`. Alphabetical, with a release count per artist.
 *
 * A solo artist calling this gets a 403 rather than an empty list: a roster is
 * not something their account has, and saying so is clearer than pretending it
 * is empty. Screens gate on `user.label` instead of calling and catching.
 */
export function listRoster() {
  return request<RosterArtistSummary[]>('/label/artists');
}

/** `GET /label/artists/{id}`. Another label's artist reads as missing. */
export function getRosterArtist(id: string) {
  return request<RosterArtist>(`/label/artists/${id}`);
}

/**
 * `POST /label/artists`. Creates the identity the label releases under — no
 * login is created, and none is implied.
 */
export function createRosterArtist(input: RosterArtistInput) {
  return request<RosterArtist>('/label/artists', {
    method: 'POST',
    body: input,
  });
}

/** `PATCH /label/artists/{id}`. Renaming moves the public slug. */
export function updateRosterArtist(id: string, input: RosterArtistInput) {
  return request<RosterArtist>(`/label/artists/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

/**
 * `DELETE /label/artists/{id}`. Refused once the artist has releases — the
 * catalogue hangs off this row, so the API answers 400 rather than cascading.
 */
export function removeRosterArtist(id: string) {
  return request<{ id: string; removed: boolean }>(`/label/artists/${id}`, {
    method: 'DELETE',
  });
}
