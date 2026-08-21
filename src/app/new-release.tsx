import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthAlert } from '@/components/auth/auth-alert';
import { FormField, SelectField } from '@/components/ui/form-field';
import { PickerSheet, type PickerOption } from '@/components/ui/picker-sheet';
import { Brand } from '@/constants/brand';
import { GENRES } from '@/constants/genres';
import { createRelease } from '@/features/catalogue/api';
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

  const [title, setTitle] = useState('');
  const [primaryGenre, setPrimaryGenre] = useState<string | null>(null);
  const [trackTitles, setTrackTitles] = useState<string[]>(['']);
  const [genreOpen, setGenreOpen] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const filledTracks = trackTitles.map((track) => track.trim()).filter(Boolean);
  const canCreate = Boolean(title.trim()) && filledTracks.length > 0;

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
        title: trimmed,
        // `type` is left out on purpose: the API derives it from the track
        // count, so sending one risks disagreeing with what the artist sees.
        ...(primaryGenre ? { primaryGenre } : {}),
        tracks: filledTracks.map((trackTitle) => ({ title: trackTitle })),
      });

      // Straight into the release rather than back to the list — the next
      // thing to do is add artwork and audio, and both live there.
      router.replace({ pathname: '/release/[id]', params: { id: created.id } });
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
      <View className="flex-row items-center gap-4 px-4 pt-4 pb-4">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}>
          <Ionicons name="close" size={26} color={Brand.white} />
        </Pressable>
        <Text className="font-outfit-bold text-title text-fg flex-1">New release</Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="gap-6 px-4 pb-[140px]"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
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
                placeholder="What is it called?"
                maxCount={MAX_TITLE}
                autoFocus
                editable={!pending}
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
                  <Ionicons name="add" size={18} color={Brand.violetInk} />
                  <Text className="font-outfit-semibold text-callout text-violet-ink">
                    Add another track
                  </Text>
                </Pressable>
              ) : null}

              <Text className="font-outfit text-caption text-muted">
                Titles only for now — you&apos;ll add the audio next.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        className="border-line-subtle bg-ink absolute right-0 bottom-0 left-0 border-t px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}>
        <Pressable
          onPress={() => void onCreate()}
          disabled={!canCreate || pending}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canCreate, busy: pending }}
          className={`rounded-button min-h-[52px] items-center justify-center py-4 ${
            !canCreate || pending ? 'bg-violet opacity-40' : 'bg-violet active:bg-violet-pressed'
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
