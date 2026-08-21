/**
 * The genre vocabulary offered at submission.
 *
 * Deliberately a fixed list rather than free text: a distributor has to map
 * whatever is stored here onto each DSP's own taxonomy, and free entry
 * guarantees that fails — "Afrobest", "afro beats" and "Afrobeats" would all
 * arrive as different genres.
 *
 * Kept under 60 characters per entry to match `@MaxLength(60)` on the API, and
 * ordered with the launch market's genres first rather than alphabetically,
 * since a Nigerian artist should not scroll past Bluegrass to reach Afrobeats.
 */
export const GENRES: readonly string[] = [
  // West and Southern Africa first — the launch market.
  'Afrobeats',
  'Afro-fusion',
  'Afro-pop',
  'Afrobeat',
  'Amapiano',
  'Alté',
  'Highlife',
  'Juju',
  'Fuji',
  'Gqom',
  'Bongo Flava',
  'Coupé-décalé',
  'Kizomba',
  'Genge',

  // Global
  'Hip-Hop',
  'Rap',
  'Drill',
  'R&B',
  'Soul',
  'Pop',
  'Dancehall',
  'Reggae',
  'Reggaeton',
  'Gospel',
  'Christian',
  'Electronic',
  'House',
  'Techno',
  'Dance',
  'Rock',
  'Alternative',
  'Indie',
  'Metal',
  'Jazz',
  'Blues',
  'Funk',
  'Country',
  'Folk',
  'Classical',
  'Latin',
  'K-Pop',
  'Instrumental',
  'Spoken Word',
  'Podcast',
  'Children’s Music',
  'World',
  'Other',
];
