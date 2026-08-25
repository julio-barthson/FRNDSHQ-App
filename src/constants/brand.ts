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

  /**
   * Blue, and the only accent.
   *
   * A second one — a blue for "expression", with blue doing the work — was
   * dropped on 2026-08-25 at the client's direction: the brand is blue, white
   * and black. Everything the blue carried now uses these.
   */
  /** Button and control fills, with white on top. */
  blue: '#0A84FF',
  bluePressed: '#0968CC',
  /**
   * Blue for text, links and icons on a dark surface. The fill blue only
   * reaches 5.8:1 against black; this is 8.8:1, so it clears AAA at body size.
   */
  blueOnInk: '#5CACFF',
  /** Tinted panels, and the hairline around one. */
  blueSurface: '#0B1E33',
  blueLine: '#153452',

  white: '#FFFFFF',
  text: '#E8EFF6',
  /** Secondary copy. 7.5:1 on black — fine for supporting text, not for body. */
  muted: '#8A9CAE',
  danger: '#FF7A66',

  /** Status tones, used by the release badges. */
  positive: '#6FD79B',
} as const;

export const Radius = { field: 12, button: 12, card: 16, pill: 999 } as const;
