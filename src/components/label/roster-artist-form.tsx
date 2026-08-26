import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AuthAlert } from '@/components/auth/auth-alert';
import { FormField } from '@/components/ui/form-field';
import { type Matchers } from '@/features/auth/field-errors';
import { useAuthErrors } from '@/features/auth/use-auth-errors';
import type { RosterArtist, RosterArtistInput } from '@/features/label/types';

const BIO_MAX = 2000;

export type RosterFieldName =
  | 'stageName'
  | 'legalName'
  | 'bio'
  | 'country'
  | 'spotifyArtistId'
  | 'appleMusicArtistId';

/**
 * The API's messages are prose, not field-prefixed, for anything the service
 * throws by hand — "That does not look like a Spotify artist link or id" has to
 * find its own field. See `field-errors.ts` for why matching beats parsing.
 */
const MATCHERS: Matchers<RosterFieldName> = {
  stageName: /^stageName\b|stage name|already on your roster/i,
  legalName: /^legalName\b|legal name/i,
  bio: /^bio\b/i,
  country: /^country\b|two-letter code/i,
  spotifyArtistId: /spotify/i,
  appleMusicArtistId: /apple music/i,
};

function Group({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(340)} className="gap-2">
      <Text className="font-outfit-medium text-caption text-muted">{title}</Text>
      <View className="bg-ink-raised rounded-card gap-4 p-4">{children}</View>
    </Animated.View>
  );
}

export interface RosterFormState {
  values: RosterArtistInput;
  dirty: boolean;
  /** Runs local checks, returns the payload, or null when something is wrong. */
  validate: () => RosterArtistInput | null;
  capture: (error: unknown) => void;
  form: React.ReactNode;
}

/**
 * The add and edit screens are the same fields over a different verb, so the
 * form lives here and each screen owns only its header, footer and call.
 */
export function useRosterArtistForm(
  existing: RosterArtist | null,
  disabled: boolean
): RosterFormState {
  const [stageName, setStageName] = useState(existing?.stageName ?? '');
  const [legalName, setLegalName] = useState(existing?.legalName ?? '');
  const [bio, setBio] = useState(existing?.bio ?? '');
  const [country, setCountry] = useState(existing?.country ?? '');
  const [spotify, setSpotify] = useState(existing?.spotifyArtistId ?? '');
  const [apple, setApple] = useState(existing?.appleMusicArtistId ?? '');

  const { fields: errors, formError, setFields, clearField, capture } =
    useAuthErrors<RosterFieldName>();

  const dirty =
    stageName !== (existing?.stageName ?? '') ||
    legalName !== (existing?.legalName ?? '') ||
    bio !== (existing?.bio ?? '') ||
    country !== (existing?.country ?? '') ||
    spotify !== (existing?.spotifyArtistId ?? '') ||
    apple !== (existing?.appleMusicArtistId ?? '');

  function validate(): RosterArtistInput | null {
    const next: Partial<Record<RosterFieldName, string>> = {};

    if (stageName.trim().length < 2) {
      next.stageName = 'Artist name must be at least 2 characters.';
    }
    if (bio.trim().length > BIO_MAX) {
      next.bio = `Bio must not exceed ${BIO_MAX} characters.`;
    }
    if (country.trim() && country.trim().length !== 2) {
      next.country = 'Use the two-letter country code, e.g. NG.';
    }

    setFields(next);
    if (Object.keys(next).length > 0) return null;

    // Blanks are sent as empty strings rather than dropped, so clearing a field
    // on edit actually clears it. `create` treats them the same as absent.
    return {
      stageName: stageName.trim(),
      legalName: legalName.trim(),
      bio: bio.trim(),
      ...(country.trim() ? { country: country.trim().toUpperCase() } : {}),
      spotifyArtistId: spotify.trim(),
      appleMusicArtistId: apple.trim(),
    };
  }

  const form = (
    <>
      <AuthAlert messages={[formError]} />

      <Group index={0} title="ARTIST">
        <FormField
          label="Artist name"
          value={stageName}
          onChangeText={(value) => {
            setStageName(value);
            clearField('stageName');
          }}
          error={errors.stageName}
          placeholder="How they appear on stores"
          autoCapitalize="words"
          maxCount={120}
          editable={!disabled}
          required
        />

        <FormField
          label="Legal name"
          value={legalName}
          onChangeText={(value) => {
            setLegalName(value);
            clearField('legalName');
          }}
          error={errors.legalName}
          hint="For contracts and royalty paperwork. Never shown publicly."
          placeholder="Optional"
          autoCapitalize="words"
          maxCount={200}
          editable={!disabled}
        />

        <FormField
          label="Country"
          value={country}
          onChangeText={(value) => {
            setCountry(value.toUpperCase());
            clearField('country');
          }}
          error={errors.country}
          placeholder="NG"
          autoCapitalize="characters"
          maxLength={2}
          editable={!disabled}
        />

        <FormField
          label="Bio"
          value={bio}
          onChangeText={(value) => {
            setBio(value);
            clearField('bio');
          }}
          error={errors.bio}
          placeholder="Optional"
          multiline
          numberOfLines={4}
          maxCount={BIO_MAX}
          editable={!disabled}
        />
      </Group>

      <Group index={1} title="STREAMING PROFILES">
        <FormField
          label="Spotify"
          value={spotify}
          onChangeText={(value) => {
            setSpotify(value);
            clearField('spotifyArtistId');
          }}
          error={errors.spotifyArtistId}
          hint="Paste the artist profile link. Leave empty for a new artist with no profile yet."
          placeholder="https://open.spotify.com/artist/…"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!disabled}
        />

        <FormField
          label="Apple Music"
          value={apple}
          onChangeText={(value) => {
            setApple(value);
            clearField('appleMusicArtistId');
          }}
          error={errors.appleMusicArtistId}
          placeholder="https://music.apple.com/…/artist/…"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!disabled}
        />
      </Group>
    </>
  );

  return {
    values: {
      stageName,
      legalName,
      bio,
      country,
      spotifyArtistId: spotify,
      appleMusicArtistId: apple,
    },
    dirty,
    validate,
    capture: (error: unknown) => capture(error, MATCHERS),
    form,
  };
}
