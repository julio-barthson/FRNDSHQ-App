import type { ReleaseSummary } from '@/features/catalogue/types';

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

/** One roster row as the dashboard needs it — lighter than the roster screen's. */
export interface OverviewArtist {
  id: string;
  stageName: string;
  avatarUrl: string | null;
  releaseCount: number;
  /**
   * Whether a Spotify profile is linked. Harmless now and a problem at
   * delivery, so the dashboard nudges rather than warns.
   */
  hasSpotify: boolean;
}

/**
 * Counts across the WHOLE roster, from a groupBy on the server rather than
 * from a page of releases — the difference between a dashboard and a decoration.
 */
export interface OverviewPipeline {
  drafts: number;
  awaitingReview: number;
  needsChanges: number;
  ready: number;
  total: number;
}

/** Mirrors `OverviewService.forLabel`. */
export interface LabelOverview {
  label: { id: string; name: string };
  roster: OverviewArtist[];
  pipeline: OverviewPipeline;
  /**
   * The DRAFT and REJECTED releases, newest first, capped server-side. Every
   * attention case the dashboard raises comes from one of those two statuses,
   * so this is enough to derive the work queue without a second request.
   */
  actionable: ReleaseSummary[];
}
