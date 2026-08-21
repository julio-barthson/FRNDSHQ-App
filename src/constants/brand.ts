/**
 * The identity palette. Auth screens sit on the ground colour in both colour
 * schemes so the native splash hands over to them without a visible change.
 *
 * Hierarchy comes from the four surface levels, not from outlines. Each step
 * up is a lighter surface, so a card reads as raised without needing a border —
 * borders here are reserved for meaning (an error, a field edge), not for
 * drawing boxes around everything.
 */
export const Brand = {
  /** The page. Body text on this is 18.1:1 — the highest contrast available. */
  ink: '#000000',
  /** Cards and rows sitting on the page. */
  inkRaised: '#101012',
  /** Chips, badges and controls sitting on a card. */
  inkHigh: '#1C1C1F',
  /**
   * Text inputs. On black there is nothing darker to recede into, so a field
   * sits fractionally above the page and leans on its border instead.
   */
  inkField: '#141416',

  /** Field edges and dividers. Not for outlining cards. */
  border: '#2A2A2E',
  /** Hairlines inside a raised surface, where `border` is too loud. */
  borderSubtle: '#1E1E22',
  borderFocus: '#0A84FF',

  /** Button and control fills, with white on top. */
  blue: '#0A84FF',
  bluePressed: '#0968CC',
  /**
   * Blue for text, links and icons on a dark surface. The fill blue only
   * reaches 5.8:1 against black; this is 8.8:1, so it clears AAA at body size.
   */
  blueOnInk: '#5CACFF',

  /**
   * Violet, the second accent. Blue drives primary actions; violet carries
   * expression — the release hero, artwork placeholders, the illustrations.
   * Same split as blue: the fill is 4.9:1 on black, `violetInk` is 9.9:1.
   */
  violet: '#7C5CFF',
  violetPressed: '#6344E0',
  violetInk: '#B9A5FF',

  white: '#FFFFFF',
  text: '#E8EFF6',
  /** Secondary copy. 7.5:1 on black — fine for supporting text, not for body. */
  muted: '#8A9CAE',
  danger: '#FF7A66',

  /** Status tones, used by the release badges. */
  positive: '#6FD79B',
} as const;

export const Radius = { field: 12, button: 12, card: 16, pill: 999 } as const;
