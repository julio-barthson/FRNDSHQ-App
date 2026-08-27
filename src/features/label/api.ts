import type {
  ArtistSeat,
  LabelOverview,
  RosterArtist,
  RosterArtistInput,
  RosterArtistSummary,
  SeatRole,
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

/**
 * `GET /label/overview`. The whole dashboard in one request: real pipeline
 * totals, the roster, and the releases still waiting on someone.
 */
export function getLabelOverview() {
  return request<LabelOverview>('/label/overview');
}

/** `GET /label/artists/{id}/seats`. Outstanding invitations and accepted seats. */
export function listSeats(artistId: string) {
  return request<ArtistSeat[]>(`/label/artists/${artistId}/seats`);
}

/**
 * `POST /label/artists/{id}/seats`. Emails a six-digit code, good for seven
 * days. Re-inviting the same address replaces the outstanding code.
 */
export function inviteSeat(artistId: string, email: string, role: SeatRole) {
  return request<ArtistSeat>(`/label/artists/${artistId}/seats`, {
    method: 'POST',
    body: { email, role },
  });
}

/** `DELETE /seats/{id}`. Label owners only; effective on the holder's next request. */
export function revokeSeat(seatId: string) {
  return request<{ id: string; revoked: boolean }>(`/seats/${seatId}`, {
    method: 'DELETE',
  });
}

/**
 * `POST /seats/accept`. Matched on the signed-in account's own email, so the
 * code has to be redeemed from the mailbox it was sent to.
 */
export function acceptSeat(code: string) {
  return request<ArtistSeat>('/seats/accept', { method: 'POST', body: { code } });
}

/** `GET /seats/mine`. The artists shared with this account. Empty for most people. */
export function listMySeats() {
  return request<ArtistSeat[]>('/seats/mine');
}
