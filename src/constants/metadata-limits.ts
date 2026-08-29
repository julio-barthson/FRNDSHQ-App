/**
 * Limits the delivery pipeline imposes, mirrored from the API.
 *
 * These are not our preferences — they are what a distribution partner
 * accepts. Kept here so a counter on screen agrees with the validator on the
 * server: a field that lets someone type 120 characters and then rejects them
 * on save is a worse experience than one that stops at 64.
 *
 * Keep in step with `backend/src/utils/metadata-limits.ts`.
 */

/** A stage name, or a label's imprint name. */
export const ARTIST_NAME_MAX = 64;

/** A legal name, for rights paperwork. Never shown publicly. */
export const LEGAL_NAME_MAX = 64;
