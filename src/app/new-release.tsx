import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthAlert } from '@/components/auth/auth-alert';
import { ArtistsSheet } from '@/components/catalogue/artists-sheet';
import { FormField, SelectField } from '@/components/ui/form-field';
import { KeyboardScroll } from '@/components/ui/keyboard-scroll';
import { PickerSheet, type PickerOption } from '@/components/ui/picker-sheet';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Brand } from '@/constants/brand';
import { GENRES } from '@/constants/genres';
import { useSession } from '@/features/auth/session';
import { createRelease } from '@/features/catalogue/api';
import { listRoster } from '@/features/label/api';
import type { RosterArtistSummary } from '@/features/label/types';
import { previewArtist, previewFeatured, typedFeatureWarning } from '@/features/catalogue/billing';
import type { ContributorInput } from '@/features/catalogue/types';
import { ApiError } from '@/lib/api';

const MAX_TRACKS = 30;
const MAX_TITLE = 200;

const GENRE_OPTIONS: PickerOption[] = GENRES.map((genre) => ({ value: genre, label: genre }));

/**
 * Deliberately small.
 *
 * Everything a release eventually needs — artwork, language, dates, rights
 * lines, per-track audio — already has a home in the edit screens, and the
 * checklist on the detail screen says what is still missing. Asking for all of
 * it up front would be a six-step wizard in front of someone who just wants to
 * start. So this collects the least the API requires, then hands straight over
 * to the release itself.
 */
export default function NewReleaseScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useSession();

  const [title, setTitle] = useState('');
  const [primaryGenre, setPrimaryGenre] = useState<string | null>(null);
  const [trackTitles, setTrackTitles] = useState<string[]>(['']);
  const [genreOpen, setGenreOpen] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Seeded with the account doing the uploading, which is what the API would
  // have defaulted to anyway. Showing it rather than assuming it is the whole
  // point: a filled-in row with an "add" beside it is what tells someone a
  // feature belongs here and not in the title.
  const [artistsOpen, setArtistsOpen] = useState(false);
  const [contributors, setContributors] = useState<ContributorInput[]>(() =>
    user?.artist?.stageName ? [{ name: user.artist.stageName, role: 'PRIMARY_ARTIST' }] : []
  );

  // A label releases under one of its roster artists, never under itself, so
  // this is the first thing it has to answer. A solo artist never sees it —
  // they can only release as themselves and the API infers it.
  const isLabel = user?.label != null;
  const [roster, setRoster] = useState<RosterArtistSummary[]>([]);
  // Seeded from the route when arriving from an artist's page, where the
  // question "who is this by" has already been answered.
  const { artistId: artistIdParam } = useLocalSearchParams<{ artistId?: string }>();
  const [rosterArtistId, setRosterArtistId] = useState<string | null>(
    () => artistIdParam ?? null
  );
  const [rosterOpen, setRosterOpen] = useState(false);

  useEffect(() => {
    if (!isLabel) return;
    let cancelled = false;

    (async () => {
      try {
        const loaded = await listRoster();
        if (cancelled) return;
        setRoster(loaded);
        // Pre-selected when there is no choice to make, which also matches
        // what the API would have defaulted to on its own. Never overrides an
        // artist named in the route.
        if (loaded.length === 1) setRosterArtistId((current) => current ?? loaded[0].id);
      } catch {
        // Left empty: the picker then shows the "no artists yet" hint, which
        // is a better answer than an error banner over an unrelated form.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLabel]);

  const selectedRosterArtist = roster.find((artist) => artist.id === rosterArtistId) ?? null;

  const filledTracks = trackTitles.map((track) => track.trim()).filter(Boolean);
  const canCreate =
    Boolean(title.trim()) && filledTracks.length > 0 && (!isLabel || rosterArtistId !== null);

  function setTrackAt(index: number, value: string) {
    setTrackTitles((current) => current.map((track, i) => (i === index ? value : track)));
  }

  function addTrackRow() {
    setTrackTitles((current) => (current.length >= MAX_TRACKS ? current : [...current, '']));
  }

  function removeTrackAt(index: number) {
    setTrackTitles((current) =>
      current.length === 1 ? current : current.filter((_, i) => i !== index)
    );
  }

  async function onCreate() {
    if (pending) return;

    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError('Give your release a title.');
      return;
    }
    if (trimmed.length > MAX_TITLE) {
      setTitleError(`Title must not exceed ${MAX_TITLE} characters.`);
      return;
    }

    setTitleError(null);
    setError(null);
    setPending(true);
    try {
      const created = await createRelease({
        ...(rosterArtistId ? { artistId: rosterArtistId } : {}),
        title: trimmed,
        // `type` is left out on purpose: the API derives it from the track
        // count, so sending one risks disagreeing with what the artist sees.
        ...(primaryGenre ? { primaryGenre } : {}),
        ...(contributors.length ? { contributors } : {}),
        tracks: filledTracks.map((trackTitle) => ({ title: trackTitle })),
      });

      // Straight into the release rather than back to the list — the next
      // thing to do is add artwork and audio, and both live there. `created`
      // asks that screen to open its what-next sheet: landing on a page of
      // empty sections says a release exists but not which part of it is the
      // artist's move.
      router.replace({
        pathname: '/release/[id]',
        params: { id: created.id, created: '1' },
      });
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.details.length > 0
          ? caught.details.join('\n')
          : caught instanceof ApiError
            ? caught.message
            : 'Could not create that release. Please try again.'
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <View className="bg-ink flex-1" style={{ paddingTop: insets.top }}>
      <ScreenHeader icon="close" label="Close" title="New release" onPress={() => router.back()} />
      <KeyboardScroll
        contentContainerClassName="gap-6 px-4"
        // Clearance for the pinned footer, which the keyboard height is
        // then added to rather than replacing.
        bottomInset={insets.bottom + 100}>
        <AuthAlert messages={[error]} />

        <Animated.View entering={FadeInDown.duration(340)} className="gap-2">
          <Text className="font-outfit-medium text-caption text-muted">ABOUT</Text>
          <View className="bg-ink-raised rounded-card gap-4 p-4">
            <FormField
              label="Release title"
              value={title}
              onChangeText={(value) => {
                setTitle(value);
                if (titleError) setTitleError(null);
              }}
              error={titleError}
              // The API refuses a feature typed in here. Saying so as it is
              // typed, next to the row that does accept one, is the difference
              // between a hint and a rejected save.
              hint={typedFeatureWarning(title) ?? undefined}
              placeholder="What is it called?"
              maxCount={MAX_TITLE}
              autoFocus
              editable={!pending}
            />

            {isLabel ? (
              <SelectField
                label="Release by"
                value={selectedRosterArtist?.stageName ?? null}
                placeholder={roster.length ? 'Choose a roster artist' : 'No artists on your roster'}
                hint={
                  roster.length
                    ? 'The artist this release is credited to on stores.'
                    : 'Add an artist on the Roster tab first.'
                }
                required
                disabled={pending || roster.length === 0}
                onPress={() => setRosterOpen(true)}
              />
            ) : null}

            {/* Pre-filled with the artist's own name, which is what the API
                would have assumed anyway. It is here to be *seen*: a feature
                is the most common thing a release needs beyond a title, and
                nothing else in this flow says where one goes. */}
            <SelectField
              label="Artists"
              value={previewArtist(contributors) || null}
              placeholder="Who is this by?"
              hint={
                previewFeatured(contributors) ?? 'Tap to credit a featured artist or a co-lead.'
              }
              disabled={pending}
              onPress={() => setArtistsOpen(true)}
            />

            <SelectField
              label="Primary genre"
              value={primaryGenre}
              placeholder="Choose a genre"
              hint="You can set this later, but it's needed before you submit."
              required
              disabled={pending}
              onPress={() => setGenreOpen(true)}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(340)} className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="font-outfit-medium text-caption text-muted">TRACKS</Text>
            <Text className="font-outfit text-caption text-muted">
              {filledTracks.length} of {MAX_TRACKS}
            </Text>
          </View>

          <View className="bg-ink-raised rounded-card gap-3 p-4">
            {trackTitles.map((track, index) => (
              <View key={index} className="flex-row items-center gap-3">
                <View className="bg-ink-high h-[32px] w-[32px] items-center justify-center rounded-full">
                  <Text className="font-outfit-semibold text-label text-muted">{index + 1}</Text>
                </View>

                <TextInput
                  className="rounded-field border-line bg-ink-field font-outfit text-body text-fg flex-1 border px-4 py-[12px]"
                  value={track}
                  onChangeText={(value) => setTrackAt(index, value)}
                  placeholder={`Track ${index + 1} title`}
                  placeholderTextColor={Brand.muted}
                  selectionColor={Brand.blue}
                  returnKeyType={index === trackTitles.length - 1 ? 'done' : 'next'}
                  editable={!pending}
                  accessibilityLabel={`Track ${index + 1} title`}
                />

                {trackTitles.length > 1 ? (
                  <Pressable
                    onPress={() => removeTrackAt(index)}
                    disabled={pending}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove track ${index + 1}`}
                    hitSlop={12}>
                    <Ionicons name="close-circle" size={20} color={Brand.muted} />
                  </Pressable>
                ) : null}
              </View>
            ))}

            {trackTitles.length < MAX_TRACKS ? (
              <Pressable
                onPress={addTrackRow}
                disabled={pending}
                accessibilityRole="button"
                className="border-line rounded-field active:bg-ink-high flex-row items-center justify-center gap-2 border border-dashed py-3">
                <Ionicons name="add" size={18} color={Brand.blueOnInk} />
                <Text className="font-outfit-semibold text-callout text-blue-ink">
                  Add another track
                </Text>
              </Pressable>
            ) : null}

            <Text className="font-outfit text-caption text-muted">
              Titles only for now — you&apos;ll add the audio next.
            </Text>
          </View>
        </Animated.View>
      </KeyboardScroll>

      <View
        className="border-line-subtle bg-ink absolute right-0 bottom-0 left-0 border-t px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}>
        <Pressable
          onPress={() => void onCreate()}
          disabled={!canCreate || pending}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canCreate, busy: pending }}
          className={`rounded-button min-h-[52px] items-center justify-center py-4 ${
            !canCreate || pending ? 'bg-blue opacity-40' : 'bg-blue active:bg-blue-pressed'
          }`}>
          {pending ? (
            <ActivityIndicator color={Brand.white} />
          ) : (
            <Text className="font-outfit-bold text-body text-white">
              {canCreate ? 'Create release' : 'Add a title and one track'}
            </Text>
          )}
        </Pressable>
      </View>

      {/* Nothing is saved here — the release does not exist yet, so the sheet
          edits local state and the list rides along with `createRelease`. */}
      <ArtistsSheet
        visible={artistsOpen}
        scope="release"
        title={title}
        contributors={contributors}
        pending={false}
        error={null}
        onCancel={() => setArtistsOpen(false)}
        onSave={(rows) => {
          setContributors(rows);
          setArtistsOpen(false);
        }}
      />

      <PickerSheet
        visible={rosterOpen}
        title="Release by"
        options={roster.map((artist) => ({
          value: artist.id,
          label: artist.stageName,
          hint:
            artist.releaseCount === 1 ? '1 release' : `${artist.releaseCount} releases`,
        }))}
        selected={rosterArtistId}
        onSelect={(value) => {
          setRosterArtistId(value);
          setRosterOpen(false);
        }}
        onClose={() => setRosterOpen(false)}
      />

      <PickerSheet
        visible={genreOpen}
        title="Primary genre"
        options={GENRE_OPTIONS}
        selected={primaryGenre}
        onSelect={setPrimaryGenre}
        onClose={() => setGenreOpen(false)}
      />
    </View>
  );
}
