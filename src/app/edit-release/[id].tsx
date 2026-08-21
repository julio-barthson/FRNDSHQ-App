import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthAlert } from '@/components/auth/auth-alert';
import { ArtworkPicker } from '@/components/catalogue/artwork-picker';
import { FormField, SelectField } from '@/components/ui/form-field';
import { PickerSheet, type PickerOption } from '@/components/ui/picker-sheet';
import { Brand } from '@/constants/brand';
import { GENRES } from '@/constants/genres';
import { LANGUAGES, findLanguage } from '@/constants/languages';
import { getRelease, updateRelease } from '@/features/catalogue/api';
import { isEditable } from '@/features/catalogue/detail';
import type { ReleaseDetail } from '@/features/catalogue/types';
import { ApiError } from '@/lib/api';

/** Straight from the DTOs — a counter that disagrees with the server is worse than none. */
const MAX = { title: 200, genre: 60, language: 20, line: 200 } as const;

const GENRE_OPTIONS: PickerOption[] = GENRES.map((genre) => ({ value: genre, label: genre }));
const LANGUAGE_OPTIONS: PickerOption[] = LANGUAGES.map((language) => ({
  value: language.code,
  label: language.name,
  hint: language.code,
}));

type Sheet = 'primary' | 'secondary' | 'language' | null;

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

/** `YYYY-MM-DD`, which is what the API stores. */
function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function readableDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function EditReleaseScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [release, setRelease] = useState<ReleaseDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [primaryGenre, setPrimaryGenre] = useState<string | null>(null);
  const [secondaryGenre, setSecondaryGenre] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [releaseDate, setReleaseDate] = useState<string | null>(null);
  const [cLine, setCLine] = useState('');
  const [pLine, setPLine] = useState('');

  const load = useCallback(async () => {
    try {
      const fetched = await getRelease(id);
      setRelease(fetched);
      setTitle(fetched.title);
      setPrimaryGenre(fetched.primaryGenre);
      setSecondaryGenre(fetched.secondaryGenre);
      setLanguage(fetched.language);
      setReleaseDate(fetched.releaseDate ? fetched.releaseDate.slice(0, 10) : null);
      setCLine(fetched.cLine ?? '');
      setPLine(fetched.pLine ?? '');
      setLoadError(null);
    } catch (caught) {
      setLoadError(caught instanceof ApiError ? caught.message : 'Could not load this release.');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Comparing against what was fetched is what lets Save report whether there
  // is anything to save, and lets the back gesture warn before discarding.
  const dirty =
    release != null &&
    (title !== release.title ||
      primaryGenre !== release.primaryGenre ||
      secondaryGenre !== release.secondaryGenre ||
      language !== release.language ||
      releaseDate !== (release.releaseDate ? release.releaseDate.slice(0, 10) : null) ||
      cLine !== (release.cLine ?? '') ||
      pLine !== (release.pLine ?? ''));

  function close() {
    if (!dirty) return router.back();

    Alert.alert('Discard changes?', 'Your edits to this release will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  async function onSave() {
    if (!release || saving || !dirty) return;

    if (!title.trim()) {
      setSaveError('A release needs a title.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      // `whitelist` and `forbidNonWhitelisted` are on in the API's
      // ValidationPipe, so only the DTO's own fields may be sent. Empty
      // strings are dropped rather than stored as blanks.
      await updateRelease(release.id, {
        title: title.trim(),
        ...(primaryGenre ? { primaryGenre } : {}),
        ...(secondaryGenre ? { secondaryGenre } : {}),
        ...(language ? { language } : {}),
        ...(releaseDate ? { releaseDate } : {}),
        ...(cLine.trim() ? { cLine: cLine.trim() } : {}),
        ...(pLine.trim() ? { pLine: pLine.trim() } : {}),
      });
      router.back();
    } catch (caught) {
      setSaveError(
        caught instanceof ApiError && caught.details.length > 0
          ? caught.details.join('\n')
          : caught instanceof ApiError
            ? caught.message
            : 'Could not save your changes. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (!release) {
    return (
      <View className="bg-ink flex-1 gap-4 px-4" style={{ paddingTop: insets.top + 24 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
          <Ionicons name="close" size={26} color={Brand.white} />
        </Pressable>
        {loadError ? (
          <AuthAlert messages={[loadError]} onRetry={() => void load()} />
        ) : (
          <ActivityIndicator color={Brand.violetInk} />
        )}
      </View>
    );
  }

  // Submitting locks a release; arriving here on one is a stale back-stack
  // entry rather than something to render an editable form for.
  if (!isEditable(release.status)) {
    return (
      <View className="bg-ink flex-1 gap-4 px-4" style={{ paddingTop: insets.top + 24 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
          <Ionicons name="close" size={26} color={Brand.white} />
        </Pressable>
        <View className="bg-ink-raised rounded-card gap-2 p-4">
          <Text className="font-outfit-semibold text-heading text-fg">Locked</Text>
          <Text className="font-outfit text-body text-muted">
            This release has been submitted, so its details can no longer be changed.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="bg-ink flex-1" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-4 px-4 pt-4 pb-4">
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}>
          <Ionicons name="close" size={26} color={Brand.white} />
        </Pressable>
        <Text className="font-outfit-bold text-title text-fg flex-1">Edit details</Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="gap-6 px-4 pb-[140px]"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          <AuthAlert messages={[saveError]} />

          <Animated.View entering={FadeInDown.duration(340)}>
            <ArtworkPicker
              releaseId={release.id}
              artworkUrl={release.artworkUrl}
              seedChar={release.title.charAt(0)}
              onChanged={() => void load()}
            />
          </Animated.View>

          <Group index={1} title="ABOUT">
            <FormField
              label="Release title"
              value={title}
              onChangeText={setTitle}
              placeholder="What is it called?"
              maxCount={MAX.title}
              editable={!saving}
            />
          </Group>

          <Group index={2} title="GENRE">
            <SelectField
              label="Primary genre"
              value={primaryGenre}
              placeholder="Choose a genre"
              required
              disabled={saving}
              onPress={() => setSheet('primary')}
            />
            <SelectField
              label="Secondary genre"
              value={secondaryGenre}
              placeholder="Optional"
              disabled={saving}
              onPress={() => setSheet('secondary')}
            />
          </Group>

          <Group index={3} title="RIGHTS & RELEASE">
            <SelectField
              label="Language"
              value={findLanguage(language)?.name ?? null}
              placeholder="Optional"
              disabled={saving}
              onPress={() => setSheet('language')}
            />

            <SelectField
              label="Release date"
              value={readableDate(releaseDate)}
              placeholder="Optional"
              hint="The street date you intend, not today's date."
              disabled={saving}
              onPress={() => setDatePickerOpen(true)}
            />

            <FormField
              label="© line"
              value={cLine}
              onChangeText={setCLine}
              placeholder="2026 Your Label"
              maxCount={MAX.line}
              editable={!saving}
            />

            <FormField
              label="℗ line"
              value={pLine}
              onChangeText={setPLine}
              placeholder="2026 Your Label"
              hint="The recording's owner, which may differ from the © owner."
              maxCount={MAX.line}
              editable={!saving}
            />
          </Group>
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        className="border-line-subtle bg-ink absolute right-0 bottom-0 left-0 border-t px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}>
        <Pressable
          onPress={() => void onSave()}
          disabled={!dirty || saving}
          accessibilityRole="button"
          accessibilityState={{ disabled: !dirty, busy: saving }}
          className={`rounded-button min-h-[52px] items-center justify-center py-4 ${
            !dirty || saving ? 'bg-violet opacity-40' : 'bg-violet active:bg-violet-pressed'
          }`}>
          {saving ? (
            <ActivityIndicator color={Brand.white} />
          ) : (
            <Text className="font-outfit-bold text-body text-white">
              {dirty ? 'Save changes' : 'No changes to save'}
            </Text>
          )}
        </Pressable>
      </View>

      <PickerSheet
        visible={sheet === 'primary'}
        title="Primary genre"
        options={GENRE_OPTIONS}
        selected={primaryGenre}
        onSelect={setPrimaryGenre}
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        visible={sheet === 'secondary'}
        title="Secondary genre"
        options={GENRE_OPTIONS}
        selected={secondaryGenre}
        onSelect={setSecondaryGenre}
        onClose={() => setSheet(null)}
        allowClear
      />
      <PickerSheet
        visible={sheet === 'language'}
        title="Language"
        options={LANGUAGE_OPTIONS}
        selected={language}
        onSelect={setLanguage}
        onClose={() => setSheet(null)}
        allowClear
      />

      {datePickerOpen ? (
        <DateTimePicker
          value={releaseDate ? new Date(`${releaseDate}T00:00:00`) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          themeVariant="dark"
          onChange={(event, date) => {
            // Android dismisses itself; iOS keeps the picker mounted.
            if (Platform.OS === 'android') setDatePickerOpen(false);
            if (event.type === 'set' && date) setReleaseDate(toIsoDate(date));
          }}
        />
      ) : null}
    </View>
  );
}
