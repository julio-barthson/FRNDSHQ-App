/**
 * The language vocabulary offered on a release.
 *
 * A fixed list rather than free text for the same reason as {@link GENRES}:
 * the field was typed by hand with a placeholder of `en, yo, pcm…`, which
 * guarantees `English`, `english`, `EN` and `eng` all end up in the same
 * column. A distributor has to map whatever is stored onto each DSP's own
 * taxonomy, and free entry makes that impossible.
 *
 * Codes are ISO 639-1 where one exists, and ISO 639-3 for the languages that
 * have no two-letter code — `pcm` (Nigerian Pidgin) among them, which matters
 * for the launch market. `@MaxLength(20)` on the DTO, so all of these fit.
 */
export interface Language {
  code: string;
  name: string;
}

export const LANGUAGES: Language[] = [
  // The launch market first, as with genres.
  { code: 'en', name: 'English' },
  { code: 'pcm', name: 'Nigerian Pidgin' },
  { code: 'yo', name: 'Yoruba' },
  { code: 'ig', name: 'Igbo' },
  { code: 'ha', name: 'Hausa' },
  { code: 'sw', name: 'Swahili' },
  { code: 'zu', name: 'Zulu' },
  { code: 'xh', name: 'Xhosa' },
  { code: 'af', name: 'Afrikaans' },
  { code: 'am', name: 'Amharic' },
  { code: 'tw', name: 'Twi' },
  { code: 'wo', name: 'Wolof' },

  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ru', name: 'Russian' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ur', name: 'Urdu' },
  { code: 'bn', name: 'Bengali' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'tr', name: 'Turkish' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'zxx', name: 'No linguistic content (instrumental)' },
];

export function findLanguage(code: string | null): Language | undefined {
  if (!code) return undefined;
  return LANGUAGES.find((language) => language.code === code);
}
