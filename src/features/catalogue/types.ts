/** Mirrors the Prisma enums in `schema.prisma`. Keep the two in step. */

export type ReleaseType = 'SINGLE' | 'EP' | 'ALBUM';

/**
 * `DELIVERING`, `LIVE` and `TAKEN_DOWN` exist in the schema but nothing in this
 * build ever sets them — distribution is a later phase. They are listed so the
 * type is complete, never because a release should be shown as live.
 */
export type ReleaseStatus =
  'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'READY' | 'REJECTED' | 'DELIVERING' | 'LIVE' | 'TAKEN_DOWN';

export type TrackStatus = 'PENDING_UPLOAD' | 'PROCESSING' | 'READY' | 'FAILED';

/** The trimmed track shape returned inside a list row. */
export interface ReleaseListTrack {
  id: string;
  title: string;
  status: TrackStatus;
  durationSec: number | null;
}

export interface ReleaseSummary {
  id: string;
  title: string;
  type: ReleaseType;
  status: ReleaseStatus;
  releaseDate: string | null;
  submittedAt: string | null;
  createdAt: string;
  trackCount: number;
  tracks: ReleaseListTrack[];
  /**
   * Presigned and short-lived — the API signs a fresh one per response, so it
   * must not be cached beyond the list it arrived with.
   */
  artworkUrl: string | null;
}

export interface ReleasePage {
  items: ReleaseSummary[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ReleaseQuery {
  status?: ReleaseStatus;
  /** Matches release or track titles. */
  search?: string;
  page?: number;
  limit?: number;
}

export interface TrackInput {
  title: string;
  versionTitle?: string;
  explicit?: boolean;
  /** A confirmed AUDIO upload. Optional — a draft may exist before the file. */
  audioAssetId?: string;
}

export interface CreateReleaseInput {
  title: string;
  /** Omitted deliberately: the API derives it from the track count. */
  type?: ReleaseType;
  releaseDate?: string;
  language?: string;
  primaryGenre?: string;
  secondaryGenre?: string;
  cLine?: string;
  pLine?: string;
  artworkAssetId?: string;
  tracks: TrackInput[];
}

export type ContributorRole =
  | 'PRIMARY_ARTIST'
  | 'FEATURED_ARTIST'
  | 'PRODUCER'
  | 'SONGWRITER'
  | 'COMPOSER'
  | 'MIXING_ENGINEER'
  | 'MASTERING_ENGINEER'
  | 'OTHER';

export interface Contributor {
  id: string;
  name: string;
  role: ContributorRole;
  roleNote: string | null;
}

export interface DetailTrack {
  id: string;
  title: string;
  versionTitle: string | null;
  trackNumber: number;
  discNumber: number;
  isrc: string | null;
  explicit: boolean;
  lyrics: string | null;
  status: TrackStatus;
  /** Why validation failed, when `status` is FAILED. */
  processingError: string | null;
  durationSec: number | null;
  sampleRate: number | null;
  audioAssetId: string | null;
  /** Presigned and short-lived, like `artworkUrl`. */
  audioUrl: string | null;
  contributors: Contributor[];
}

export interface ReleaseDetail {
  id: string;
  title: string;
  type: ReleaseType;
  status: ReleaseStatus;
  /** Assigned by the distribution partner. Null in this phase. */
  upc: string | null;
  releaseDate: string | null;
  language: string | null;
  primaryGenre: string | null;
  secondaryGenre: string | null;
  cLine: string | null;
  pLine: string | null;
  artworkAssetId: string | null;
  artworkUrl: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  /** Why a release came back REJECTED. */
  reviewNotes: string | null;
  rightsConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tracks: DetailTrack[];
}

/**
 * `UpdateReleaseDto` — every create field except `tracks`, which have their
 * own endpoints because each one owns an uploaded file.
 */
export interface UpdateReleaseInput {
  title?: string;
  /**
   * Only sent when promoting a SINGLE so a second track can be added — the API
   * rejects `SINGLE` whenever the track count is not exactly one.
   */
  type?: ReleaseType;
  releaseDate?: string;
  language?: string;
  primaryGenre?: string;
  secondaryGenre?: string;
  cLine?: string;
  pLine?: string;
}

export interface UpdateTrackInput {
  title?: string;
  versionTitle?: string;
  explicit?: boolean;
}
