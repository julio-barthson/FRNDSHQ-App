/**
 * The same colours as `global.css`, for the places `className` cannot reach.
 *
 * Tab bars, `RefreshControl`, `ActivityIndicator`, Ionicons and every other
 * prop-shaped colour take a plain string, not a class — so a CSS variable is no
 * use to them. This file is the second copy, and the two must be kept in step
 * by hand. There is no way to derive one from the other at runtime: the CSS
 * variables live in the style engine, not in JS.
 *
 * If you change a colour, change it in both places.
 */

export interface Palette {
  ink: string;
  inkRaised: string;
  inkHigh: string;
  inkField: string;

  line: string;
  lineSubtle: string;
  lineFocus: string;

  blue: string;
  bluePressed: string;
  blueOnInk: string;
  blueSurface: string;
  blueLine: string;

  fg: string;
  muted: string;
  danger: string;
  positive: string;
  info: string;

  white: string;
}

/** The app's own look, and what the native splash hands over to. */
export const dark: Palette = {
  ink: '#000000',
  inkRaised: '#101012',
  inkHigh: '#1C1C1F',
  inkField: '#141416',

  line: '#2A2A2E',
  lineSubtle: '#1E1E22',
  lineFocus: '#0A84FF',

  blue: '#0A84FF',
  bluePressed: '#0968CC',
  blueOnInk: '#5CACFF',
  blueSurface: '#0B1E33',
  blueLine: '#153452',

  fg: '#E8EFF6',
  muted: '#8A9CAE',
  danger: '#FF7A66',
  positive: '#6FD79B',
  info: '#7FB8FF',

  white: '#FFFFFF',
};

/**
 * Light.
 *
 * Every text tone here clears 4.5:1 on white, and the blue *fill* drops to the
 * deeper `#0968CC` so white labels on a button reach 5.44:1 — the brand blue
 * only manages 3.65:1 under white, which is fine on black and not on white.
 */
export const light: Palette = {
  ink: '#FFFFFF',
  inkRaised: '#F7F8FA',
  inkHigh: '#EEF1F5',
  inkField: '#F2F4F7',

  line: '#D8DEE7',
  lineSubtle: '#E8ECF2',
  lineFocus: '#0A84FF',

  blue: '#0968CC',
  bluePressed: '#0A56A6',
  blueOnInk: '#0968CC',
  blueSurface: '#EAF3FF',
  blueLine: '#C7E0FF',

  fg: '#0B1926',
  muted: '#5B6B7C',
  danger: '#C0341F',
  positive: '#12734A',
  info: '#0A62B8',

  white: '#FFFFFF',
};

export const palettes = { light, dark } as const;
