import { useColorScheme } from 'nativewind';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { palettes, type Palette } from '@/features/theme/palette';
import { themeStore } from '@/features/theme/theme-store';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeApi {
  /** What the person chose. `system` means follow the device. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** What that resolves to right now. Never `system`. */
  scheme: 'light' | 'dark';
  colors: Palette;
}

const ThemeContext = createContext<ThemeApi | null>(null);

/**
 * Light, dark, or whatever the phone is doing.
 *
 * Two things are kept apart on purpose. The **preference** is what the person
 * chose and is the thing that persists; the **scheme** is what it resolves to
 * right now, which for `system` changes under you when the device flips at
 * sunset. Storing the resolved value instead would freeze someone's app in
 * whatever mode their phone happened to be in the day they installed it.
 *
 * `setColorScheme(null)` hands control back to the device — that is what makes
 * `system` a live setting rather than a one-off read.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  // Applied before the first paint the person sees, so a chosen light theme
  // does not flash the dark ground on every cold start.
  useEffect(() => {
    let cancelled = false;

    void themeStore.get().then((stored) => {
      if (cancelled || !stored) return;
      setPreferenceState(stored);
      setColorScheme(stored === 'system' ? null : stored);
    });

    return () => {
      cancelled = true;
    };
  }, [setColorScheme]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      setColorScheme(next === 'system' ? null : next);
      // Persisted after applying: the switch should feel instant, and a failed
      // write costs a preference, not a broken screen.
      void themeStore.set(next);
    },
    [setColorScheme]
  );

  // `colorScheme` already resolves `system` against the device. Dark is the
  // fallback rather than light, because it is the app's own look and the colour
  // the native splash hands over to.
  const scheme: 'light' | 'dark' = colorScheme === 'light' ? 'light' : 'dark';

  const value = useMemo<ThemeApi>(
    () => ({ preference, setPreference, scheme, colors: palettes[scheme] }),
    [preference, setPreference, scheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Falls back to dark rather than throwing.
 *
 * A component rendered outside the provider — a screen mounted before the shell
 * settles — should render in the app's own colours, not crash.
 */
export function useTheme(): ThemeApi {
  return (
    useContext(ThemeContext) ?? {
      preference: 'system',
      setPreference: () => {},
      scheme: 'dark',
      colors: palettes.dark,
    }
  );
}

/** The common case: just the colours, for a prop that takes a string. */
export function useThemeColors(): Palette {
  return useTheme().colors;
}
