import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardScroll } from '@/components/ui/keyboard-scroll';
import { Brand } from '@/constants/brand';
import {
  BILLING_ROLES,
  ROLE_HINT,
  ROLE_LABEL,
  previewArtist,
  previewTitle,
} from '@/features/catalogue/billing';
import type { ContributorInput, ContributorRole } from '@/features/catalogue/types';

/**
 * The least this sheet needs to know about a row.
 *
 * Deliberately not `Contributor`: the new-release screen opens this over a list
 * that has never been saved and so has no ids or positions yet. A saved
 * `Contributor` satisfies this shape anyway.
 */
export type BillingRow = { name: string; role: ContributorRole };

/** A row being edited. `key` is local — these have no id until they are saved. */
interface Draft extends ContributorInput {
  key: string;
}

let nextKey = 0;

function toDrafts(rows: BillingRow[]): Draft[] {
  return rows
    .filter((row) => BILLING_ROLES.includes(row.role))
    .map((row, index) => ({ key: `existing-${index}`, name: row.name, role: row.role }));
}

function RolePicker({
  value,
  onChange,
  disabled,
}: {
  value: ContributorRole;
  onChange: (role: ContributorRole) => void;
  disabled: boolean;
}) {
  return (
    <View className="gap-2">
      <View className="bg-ink-high flex-row rounded-full p-1">
        {BILLING_ROLES.map((role) => {
          const selected = value === role;
          return (
            <Pressable
              key={role}
              onPress={() => onChange(role)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              className={`min-h-[34px] flex-1 items-center justify-center rounded-full px-2 ${
                selected ? 'bg-blue' : ''
              }`}>
              <Text
                className={`font-outfit-medium text-caption ${
                  selected ? 'text-white' : 'text-muted'
                }`}
                numberOfLines={1}>
                {ROLE_LABEL[role]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* The consequence, not the label. Main artist and featured look like the
          same kind of choice and are not — one puts the release in someone's
          discography and the other does not. */}
      {ROLE_HINT[value] ? (
        <Text className="font-outfit text-caption text-muted">{ROLE_HINT[value]}</Text>
      ) : null}
    </View>
  );
}

/**
 * Who a release or a track is by.
 *
 * The one thing this screen exists to prevent is a featured artist being typed
 * into a title. Stores compose "(feat. …)" from the metadata themselves, and a
 * title carrying it verbatim is among the most common reasons a release comes
 * back rejected — so the preview at the top shows the artist exactly the string
 * their release will carry, built from rows rather than from typing.
 *
 * Reachable from both the release and each track. A release names who the whole
 * thing is by; a track only needs its own list when it differs, which is what a
 * feature on one song of an album is.
 */
export function ArtistsSheet({
  visible,
  scope,
  title,
  versionTitle,
  contributors,
  inheritedArtist,
  pending,
  error,
  onCancel,
  onSave,
}: {
  visible: boolean;
  /** Changes the copy: a release is billed, a track is credited. */
  scope: 'release' | 'track';
  title: string;
  versionTitle?: string | null;
  contributors: BillingRow[];
  /** For a track with no billing of its own — what it falls back to. */
  inheritedArtist?: string;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (rows: ContributorInput[]) => void;
}) {
  const [drafts, setDrafts] = useState<Draft[]>(() => toDrafts(contributors));

  // Seeded on the way open, and only then — keying this off `contributors` as
  // well would throw away half-finished edits every time the screen behind it
  // refetched.
  const [wasVisible, setWasVisible] = useState(false);
  useEffect(() => {
    if (visible && !wasVisible) {
      setDrafts(toDrafts(contributors));
      setWasVisible(true);
    } else if (!visible && wasVisible) {
      setWasVisible(false);
    }
  }, [visible, wasVisible, contributors]);

  function addRow(role: ContributorRole) {
    setDrafts((current) => [...current, { key: `new-${nextKey++}`, name: '', role }]);
  }

  function patchRow(key: string, patch: Partial<Draft>) {
    setDrafts((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function removeRow(key: string) {
    setDrafts((current) => current.filter((row) => row.key !== key));
  }

  const filled = drafts.filter((row) => row.name.trim());
  const hasPrimary = filled.some((row) => row.role === 'PRIMARY_ARTIST');
  const isRelease = scope === 'release';

  // A track may legitimately have no billing of its own — it inherits the
  // release's. A release may not: there would be nobody to put it out.
  const blocked = isRelease && !hasPrimary;

  const artistLine = previewArtist(filled) || inheritedArtist || '—';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Brand.ink }} edges={['top', 'bottom']}>
        <View className="flex-row items-center gap-4 px-5 py-4">
          <Pressable
            onPress={onCancel}
            disabled={pending}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            hitSlop={12}>
            <Ionicons name="close" size={26} color={Brand.white} />
          </Pressable>

          <Text className="font-outfit-bold text-title text-fg flex-1">Artists</Text>

          <Pressable
            onPress={() => onSave(filled.map((row) => ({ name: row.name.trim(), role: row.role })))}
            disabled={blocked || pending}
            accessibilityRole="button"
            accessibilityState={{ disabled: blocked, busy: pending }}
            hitSlop={12}>
            {pending ? (
              <ActivityIndicator color={Brand.blueOnInk} />
            ) : (
              <Text
                className={`font-outfit-semibold text-body ${
                  blocked ? 'text-muted' : 'text-blue-ink'
                }`}>
                Save
              </Text>
            )}
          </Pressable>
        </View>

        <KeyboardScroll contentContainerClassName="gap-5 px-5 pb-8">
          {error ? (
            <View className="border-danger-line bg-danger-surface rounded-card border p-3">
              <Text className="font-outfit text-callout text-danger">{error}</Text>
            </View>
          ) : null}

          {/* The whole point of the screen, at the top of it: the string the
              stores will actually print, assembled from the rows below. */}
          <View className="border-blue-line bg-blue-surface rounded-card gap-2 border p-4">
            <Text className="font-outfit-medium text-caption text-blue-ink">
              HOW THIS WILL APPEAR
            </Text>
            <Text className="font-outfit-bold text-heading text-fg">
              {previewTitle(title, versionTitle ?? null, filled)}
            </Text>
            <Text className="font-outfit text-callout text-muted">{artistLine}</Text>
          </View>

          {!isRelease && filled.length === 0 && inheritedArtist ? (
            <Text className="font-outfit text-callout text-muted">
              This track is credited to the release&apos;s artists. Add someone here only if this
              one is different — a guest verse, or a remix.
            </Text>
          ) : null}

          <View className="gap-3">
            {drafts.map((row, index) => (
              <Animated.View
                key={row.key}
                entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(260)}
                className="bg-ink-raised rounded-card gap-3 p-4">
                <View className="flex-row items-center gap-3">
                  <TextInput
                    className="rounded-field border-line bg-ink-field font-outfit text-body text-fg flex-1 border px-4 py-[12px]"
                    value={row.name}
                    onChangeText={(name) => patchRow(row.key, { name })}
                    placeholder="Artist name, exactly as it appears on stores"
                    placeholderTextColor={Brand.muted}
                    selectionColor={Brand.blue}
                    autoCapitalize="words"
                    autoCorrect={false}
                    maxLength={150}
                    editable={!pending}
                    accessibilityLabel={`Artist ${index + 1} name`}
                  />

                  <Pressable
                    onPress={() => removeRow(row.key)}
                    disabled={pending}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${row.name || `artist ${index + 1}`}`}
                    hitSlop={10}>
                    <Ionicons name="close-circle" size={22} color={Brand.muted} />
                  </Pressable>
                </View>

                <RolePicker
                  value={row.role}
                  onChange={(role) => patchRow(row.key, { role })}
                  disabled={pending}
                />
              </Animated.View>
            ))}
          </View>

          <View className="gap-2">
            <Pressable
              onPress={() => addRow('PRIMARY_ARTIST')}
              disabled={pending}
              accessibilityRole="button"
              className="border-line rounded-field active:bg-ink-high flex-row items-center justify-center gap-2 border border-dashed py-3">
              <Ionicons name="person-add" size={18} color={Brand.blueOnInk} />
              <Text className="font-outfit-semibold text-callout text-blue-ink">
                Add a main artist
              </Text>
            </Pressable>

            <Pressable
              onPress={() => addRow('FEATURED_ARTIST')}
              disabled={pending}
              accessibilityRole="button"
              className="border-line rounded-field active:bg-ink-high flex-row items-center justify-center gap-2 border border-dashed py-3">
              <Ionicons name="mic" size={18} color={Brand.blueOnInk} />
              <Text className="font-outfit-semibold text-callout text-blue-ink">
                Add a featured artist
              </Text>
            </Pressable>
          </View>

          {blocked ? (
            <Text className="font-outfit text-caption text-danger">
              A release needs at least one main artist — someone has to be putting it out.
            </Text>
          ) : (
            <Text className="font-outfit text-caption text-muted">
              Spell names exactly as they appear on Spotify and Apple Music. A mismatch sends the
              release to the wrong artist page, and that is slow to undo.
            </Text>
          )}
        </KeyboardScroll>
      </SafeAreaView>
    </Modal>
  );
}
