/** Mirrors `UserResponseDto` in the backend. Keep the two in step. */
export type AdminPosition =
  'SUPER_ADMIN' | 'ADMIN' | 'FINANCE' | 'SUPPORT' | 'MODERATOR' | 'VIEWER';

export interface ArtistProfile {
  id: string;
  stageName: string;
  slug: string;
  legalName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  country: string | null;
  labelId: string | null;
}

/** A LABEL account's imprint. Mirrors `LabelProfileDto`. */
export interface LabelProfile {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  logoUrl: string | null;
}

export type AccountType = 'ARTIST' | 'LABEL';

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  phoneVerified: boolean;
  country: string | null;
  image: string | null;
  role: 'ARTIST' | 'LABEL' | 'ADMIN';
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  onboardingCompleted: boolean;
  mustChangePassword: boolean;
  /**
   * Whether transactional mail reaches them. Silences email only — the in-app
   * notification centre is a record, not a preference.
   */
  emailNotifications: boolean;
  acceptedTermsAt: string | null;
  termsVersion: string | null;
  createdAt: string;
  artist: ArtistProfile | null;
  /**
   * Set for a LABEL account. Exactly one of `artist` and `label` is set once
   * onboarding has chosen; both are null before that.
   */
  label: LabelProfile | null;
  adminPosition: AdminPosition | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

/** `POST /auth/register` returns no tokens — verification comes first. */
export interface RegisterResult {
  email: string;
  message: string;
}

/**
 * Mirrors `UpdateProfileDto`. Every field is optional because onboarding saves
 * one step at a time; `isComplete` is sent only on the last one, so a
 * half-finished profile never counts as done.
 */
export interface ProfileInput {
  firstName?: string;
  lastName?: string;
  /** E.164, e.g. `+2348012345678`. */
  phoneNumber?: string;
  /** ISO 3166-1 alpha-2. */
  country?: string;
  stageName?: string;
  legalName?: string;
  bio?: string;
  avatarUrl?: string;
  isComplete?: boolean;
  emailNotifications?: boolean;
}

export interface RegisterInput {
  email: string;
  phoneNumber: string;
  country: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}
