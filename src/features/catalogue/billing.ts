import type { Contributor, ContributorInput, ContributorRole } from '@/features/catalogue/types';

/**
 * Artist billing, on the app's side.
 *
 * The API composes `displayArtist` and `displayTitle` and sends them down, so
 * nothing here duplicates that. What this file is for is the editor: showing an
 * artist what their credit will look like as they type it, before anything has
 * been saved and there is no server string to show yet.
 *
 * The rule underneath all of it is that a title is a title. Stores build
 * `Song (feat. Someone)` from the metadata themselves, and typing it into the
 * title field is one of the most common reasons a release is rejected. The API
 * refuses it; this file is how the app explains it.
 */

/** The roles Phase 1 collects. The rest exist in the schema without a UI. */
export const BILLING_ROLES: ContributorRole[] = ['PRIMARY_ARTIST', 'FEATURED_ARTIST', 'REMIXER'];

/**
 * The rest: people who made the recording without appearing on the cover.
 *
 * Kept apart from {@link BILLING_ROLES} because they answer different
 * questions. A billing role changes the delivered title and who the release
 * belongs to; a credit changes neither, and collecting both in one list would
 * invite someone to make their producer a featured artist to get them listed.
 *
 * `OTHER` is deliberately absent: it exists so the API can accept a role it
 * does not recognise, not so the app can offer "something else" as a choice.
 */
export const CREDIT_ROLES: ContributorRole[] = [
  'PRODUCER',
  'SONGWRITER',
  'COMPOSER',
  'MIXING_ENGINEER',
  'MASTERING_ENGINEER',
];

/**
 * Splits a contributor list along that line.
 *
 * Both sheets send back a whole list and `PATCH /tracks/{id}` replaces what is
 * there, so each has to carry the other's rows through untouched — otherwise
 * saving the artists sheet silently deletes every credit, and vice versa.
 */
export function partitionContributors<T extends { role: ContributorRole }>(
  rows: T[]
): { billing: T[]; credits: T[] } {
  return {
    billing: rows.filter((row) => BILLING_ROLES.includes(row.role)),
    credits: rows.filter((row) => !BILLING_ROLES.includes(row.role)),
  };
}

export const ROLE_LABEL: Record<ContributorRole, string> = {
  PRIMARY_ARTIST: 'Main artist',
  FEATURED_ARTIST: 'Featured',
  REMIXER: 'Remixer',
  PRODUCER: 'Producer',
  SONGWRITER: 'Songwriter',
  COMPOSER: 'Composer',
  MIXING_ENGINEER: 'Mixing engineer',
  MASTERING_ENGINEER: 'Mastering engineer',
  OTHER: 'Other',
};

/**
 * What each role actually costs or grants, in the artist's terms.
 *
 * This is the part people get wrong, and they get it wrong because the two
 * options look interchangeable in every distributor's UI. They are not: main
 * artist puts the release in someone's discography, featured does not.
 */
export const ROLE_HINT: Partial<Record<ContributorRole, string>> = {
  PRIMARY_ARTIST: 'Shown on the cover. The release appears on their artist page.',
  FEATURED_ARTIST: 'Credited in the title as "feat.". No discography entry.',
  REMIXER: 'Credit the version to them. Name the version below too.',
  PRODUCER: 'Made the record. Shown in credits, not in the title.',
  SONGWRITER: 'Wrote the words. Publishing royalties are matched on this.',
  COMPOSER: 'Wrote the music. Often the same person as the songwriter.',
  MIXING_ENGINEER: 'Mixed the recording.',
  MASTERING_ENGINEER: 'Mastered the recording.',
};

/**
 * "Prod. Sarz · 2 songwriters" — enough to see at a glance whether a track has
 * been credited, without reproducing the sheet on the card.
 */
export function creditSummary(rows: { name: string; role: ContributorRole }[]): string {
  const credits = rows.filter((row) => CREDIT_ROLES.includes(row.role) && row.name.trim());
  if (credits.length === 0) return '';

  const producers = credits.filter((row) => row.role === 'PRODUCER');
  const rest = credits.length - producers.length;

  const parts: string[] = [];
  if (producers.length > 0) parts.push(`Prod. ${joinNames(producers.map((row) => row.name))}`);
  if (rest > 0) parts.push(`${rest} more credit${rest === 1 ? '' : 's'}`);

  return parts.join(' · ');
}

/** "Asake & Olamide", or "A, B & C" past two. */
export function joinNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

function named(rows: { name: string; role: ContributorRole }[], role: ContributorRole): string[] {
  return rows.filter((row) => row.role === role && row.name.trim()).map((row) => row.name.trim());
}

/** The primary artists, joined. Matches `displayArtist` on the API. */
export function previewArtist(rows: { name: string; role: ContributorRole }[]): string {
  return joinNames(named(rows, 'PRIMARY_ARTIST'));
}

/**
 * The featured credit on its own — "feat. Burna Boy".
 *
 * For the collapsed row that opens the editor. The value beside "Artists" is
 * the primary billing, so without this a feature could be added and the row
 * would not visibly change, which reads as the tap having done nothing.
 */
export function previewFeatured(rows: { name: string; role: ContributorRole }[]): string | null {
  const featured = named(rows, 'FEATURED_ARTIST');
  return featured.length > 0 ? `feat. ${joinNames(featured)}` : null;
}

/**
 * The title as a store would print it. Matches `displayTitle` on the API —
 * version first, then features, square brackets on the second aside so two
 * parentheses never run together.
 */
export function previewTitle(
  title: string,
  versionTitle: string | null,
  rows: { name: string; role: ContributorRole }[]
): string {
  const featured = named(rows, 'FEATURED_ARTIST');

  let result = title.trim() || 'Untitled';
  if (versionTitle?.trim()) result += ` (${versionTitle.trim()})`;
  if (featured.length > 0) {
    const credit = `feat. ${joinNames(featured)}`;
    result += versionTitle?.trim() ? ` [${credit}]` : ` (${credit})`;
  }

  return result;
}

// Mirrors the API's guard so the app can say so before a request is spent.
const TYPED_FEATURE =
  /[([\-–—/,]\s*(feat\.?|ft\.?|featuring|with)\s+\S|^\s*(feat\.?|ft\.?|featuring)\s+\S/i;

/** Warns about a feature typed into a title, which the API will refuse. */
export function typedFeatureWarning(title: string): string | null {
  return TYPED_FEATURE.test(title)
    ? 'Leave the featured artist out of the title — add them under Artists and stores will print "(feat. …)" themselves.'
    : null;
}

/** Strips ids and positions for sending back; the API renumbers from order. */
export function toInput(rows: Contributor[] | ContributorInput[]): ContributorInput[] {
  return rows
    .filter((row) => row.name.trim())
    .map((row) => ({
      name: row.name.trim(),
      role: row.role,
      ...(row.roleNote ? { roleNote: row.roleNote } : {}),
    }));
}
