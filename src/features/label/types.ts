/** Mirrors `rosterArtistSelect` in the backend's `roster.service.ts`. */
export interface RosterArtist {
  id: string;
  stageName: string;
  slug: string;
  legalName: string | null;
  bio: string | null;
  country: string | null;
  avatarUrl: string | null;
  /** Bare DSP ids. The API accepts a pasted profile URL and stores the id. */
  spotifyArtistId: string | null;
  appleMusicArtistId: string | null;
  createdAt: string;
}

/** The list adds two counts the detail route does not carry. */
export interface RosterArtistSummary extends RosterArtist {
  releaseCount: number;
  /**
   * Whether this identity also has a login. False for every artist a label
   * creates — a roster artist is metadata the label owns. The seat layer that
   * would make it true is a later phase.
   */
  hasOwnLogin: boolean;
}

export interface RosterArtistInput {
  stageName: string;
  legalName?: string;
  bio?: string;
  country?: string;
  avatarUrl?: string;
  /** A profile URL is fine here; the API reduces it to the id. */
  spotifyArtistId?: string;
  appleMusicArtistId?: string;
}
