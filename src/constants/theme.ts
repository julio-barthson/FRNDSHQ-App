/**
 * The parts of the design system that `className` cannot reach.
 *
 * Styling lives in Tailwind (`src/global.css`) — this file exists only because
 * a handful of React Native APIs take a colour or a text style as a *prop*, not
 * a style: `ActivityIndicator color`, `RefreshControl tintColor`,
 * `placeholderTextColor`, `selectionColor`, navigator tints, and anything
 * measured in JS. Reach for `className` first; come here only when there is no
 * class that fits. Values are mirrored from the theme block in `global.css`.
 */

import { Platform } from 'react-native';

/**
 * Outfit ships one file per weight, and React Native will not synthesise a
 * weight for a bundled face — pairing a custom `fontFamily` with `fontWeight`
 * gets you the regular file on Android and a faux bold on web. Text styles
 * therefore name the face they want and leave `fontWeight` off.
 *
 * These keys must match the faces loaded in `src/app/_layout.tsx` and the
 * `--font-outfit-*` variables in `global.css`.
 */
export const FontFamily = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semiBold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
} as const;

/** Mirrors the `--text-*` scale. Only for props that take a text style. */
export const Type = {
  display: { fontSize: 30, lineHeight: 36 },
  title: { fontSize: 22, lineHeight: 28 },
  heading: { fontSize: 17, lineHeight: 23 },
  body: { fontSize: 16, lineHeight: 22 },
  callout: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 11, lineHeight: 15 },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
