import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { Brand } from '@/constants/brand';

/**
 * Empty-state artwork, drawn rather than imported.
 *
 * SVG instead of raster files: these need to sit on pure black at any size and
 * follow the palette, and a PNG would carry its own background and go soft on a
 * 3x screen. They are deliberately geometric — the app has no illustration
 * style yet, and inventing a character set here would be a bigger commitment
 * than the screens can justify.
 */

const VIOLET = '#7c5cff';
const VIOLET_INK = '#b9a5ff';

/** A record leaving its sleeve. For a catalogue with nothing in it yet. */
export function EmptyCatalogue({ size = 148 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 148 148" accessibilityRole="image">
      <Defs>
        <LinearGradient id="sleeve" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={VIOLET} stopOpacity="0.85" />
          <Stop offset="1" stopColor={Brand.blue} stopOpacity="0.7" />
        </LinearGradient>
        <LinearGradient id="disc" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2A2A2E" />
          <Stop offset="1" stopColor="#101012" />
        </LinearGradient>
      </Defs>

      {/* The record, half out of the sleeve. */}
      <G>
        <Circle cx="92" cy="74" r="40" fill="url(#disc)" stroke={Brand.border} strokeWidth="1" />
        <Circle cx="92" cy="74" r="28" fill="none" stroke={Brand.borderSubtle} strokeWidth="1" />
        <Circle cx="92" cy="74" r="19" fill="none" stroke={Brand.borderSubtle} strokeWidth="1" />
        <Circle cx="92" cy="74" r="9" fill={VIOLET} opacity="0.9" />
        <Circle cx="92" cy="74" r="2.5" fill={Brand.ink} />
      </G>

      {/* The sleeve, in front. */}
      <Rect x="18" y="38" width="72" height="72" rx="8" fill="url(#sleeve)" />
      <Rect
        x="18"
        y="38"
        width="72"
        height="72"
        rx="8"
        fill="none"
        stroke={Brand.white}
        strokeOpacity="0.14"
        strokeWidth="1"
      />

      {/* A couple of sparks, so it reads as anticipation rather than absence. */}
      <Path
        d="M124 34 l3.2 7.8 7.8 3.2 -7.8 3.2 -3.2 7.8 -3.2 -7.8 -7.8 -3.2 7.8 -3.2z"
        fill={VIOLET_INK}
        opacity="0.85"
      />
      <Path
        d="M34 20 l2 4.9 4.9 2 -4.9 2 -2 4.9 -2 -4.9 -4.9 -2 4.9 -2z"
        fill={Brand.blueOnInk}
        opacity="0.6"
      />
    </Svg>
  );
}

/** A magnifier over an empty staff. For a search that matched nothing. */
export function EmptySearch({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityRole="image">
      <G opacity="0.5">
        <Rect x="14" y="40" width="92" height="2" rx="1" fill={Brand.border} />
        <Rect x="14" y="56" width="92" height="2" rx="1" fill={Brand.border} />
        <Rect x="14" y="72" width="92" height="2" rx="1" fill={Brand.border} />
      </G>

      <Circle
        cx="54"
        cy="56"
        r="26"
        fill={Brand.ink}
        stroke={VIOLET_INK}
        strokeWidth="3"
        opacity="0.95"
      />
      <Path
        d="M73 75 L92 94"
        stroke={VIOLET_INK}
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.95"
      />
      <Ellipse cx="54" cy="56" rx="26" ry="26" fill={VIOLET} opacity="0.08" />
    </Svg>
  );
}

/** A stack of waveform bars. For a release with no audio on it yet. */
export function EmptyAudio({ size = 100 }: { size?: number }) {
  const bars = [10, 22, 34, 18, 42, 26, 14, 30, 20, 8];

  return (
    <Svg width={size} height={size * 0.6} viewBox="0 0 100 60" accessibilityRole="image">
      {bars.map((height, index) => (
        <Rect
          key={index}
          x={4 + index * 10}
          y={30 - height / 2}
          width="5"
          height={height}
          rx="2.5"
          fill={index % 3 === 0 ? VIOLET : Brand.border}
          opacity={index % 3 === 0 ? 0.9 : 0.6}
        />
      ))}
    </Svg>
  );
}

/**
 * The scrim that makes white text legible over any cover art. Rendered as SVG
 * rather than a gradient library — `react-native-svg` is already here for the
 * Google mark, and this avoids another native module.
 */
export function ArtworkScrim() {
  return (
    <Svg width="100%" height="100%" accessibilityElementsHidden>
      <Defs>
        <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000000" stopOpacity="0.15" />
          <Stop offset="0.45" stopColor="#000000" stopOpacity="0.45" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0.92" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#scrim)" />
    </Svg>
  );
}

/** Stand-in cover art, so a release without artwork still reads as a record. */
export function ArtworkPlaceholder({ seedChar }: { seedChar: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" accessibilityElementsHidden>
      <Defs>
        <LinearGradient id="placeholder" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={VIOLET} stopOpacity="0.55" />
          <Stop offset="1" stopColor={Brand.blue} stopOpacity="0.4" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill="url(#placeholder)" />
      <Circle cx="50" cy="50" r="26" fill="#000000" opacity="0.22" />
      <Circle cx="50" cy="50" r="6" fill="#000000" opacity="0.35" />
    </Svg>
  );
}

/**
 * The scrim over a blurred artwork backdrop.
 *
 * Reaches full black rather than stopping at 92% like {@link ArtworkScrim}:
 * this one has to hand over to the page itself, and any gap shows as a seam
 * where the backdrop ends.
 */
export function BackdropScrim() {
  return (
    <Svg width="100%" height="100%" accessibilityElementsHidden>
      <Defs>
        <LinearGradient id="backdrop" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000000" stopOpacity="0.35" />
          <Stop offset="0.5" stopColor="#000000" stopOpacity="0.72" />
          <Stop offset="1" stopColor="#000000" stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#backdrop)" />
    </Svg>
  );
}

/**
 * A soft pool of light under the cover, so it sits on the page rather than
 * being pasted onto it. React Native cannot blur a plain view, so the falloff
 * is a radial gradient rather than a shadow.
 */
export function Glow({ color = VIOLET }: { color?: string }) {
  return (
    <Svg width="100%" height="100%" accessibilityElementsHidden>
      <Defs>
        <RadialGradient id="glow" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor={color} stopOpacity="0.45" />
          <Stop offset="0.6" stopColor={color} stopOpacity="0.12" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="url(#glow)" />
    </Svg>
  );
}
