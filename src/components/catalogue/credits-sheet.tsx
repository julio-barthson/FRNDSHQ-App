import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardScroll } from '@/components/ui/keyboard-scroll';
import { Brand } from '@/constants/brand';
import { CREDIT_ROLES, ROLE_HINT, ROLE_LABEL } from '@/features/catalogue/billing';
import type { ContributorInput, ContributorRole } from '@/features/catalogue/types';

interface Draft extends ContributorInput {
  key: string;
}

let nextKey = 0;

function toDrafts(rows: { name: string; role: ContributorRole }[]): Draft[] {
  return rows
    .filter((row) => CREDIT_ROLES.includes(row.role))
    .map((row, index) => ({ key: `existing-${index}`, name: row.name, role: row.role }));
}

function RoleChips({
  value,
  onChange,
  disabled,
}: {
  value: ContributorRole;
  onChange: (role: ContributorRole) => void;
  disabled: boolean;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {CREDIT_ROLES.map((role) => {
        const selected = value === role;
        return (
          <Pressable
            key={role}
            onPress={() => onChange(role)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            className={`rounded-full border px-3 py-[6px] ${
              selected ? 'border-blue bg-blue' : 'border-line bg-ink-raised active:bg-ink-high'
            }`}>
            <Text
              className={`font-outfit-medium text-caption ${
                selected ? 'text-white' : 'text-muted'
              }`}>
              {ROLE_LABEL[role]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Producer, songwriter, composer and engineer credits for one recording.
 *
 * Separate from {@link ArtistsSheet} on purpose. Billing decides the delivered
 * title and whose discography the release lands in; a credit does neither. Put
 * them in one list and the first person who wants their producer listed will
 * make them a featured artist, which changes the title on every store.
 *
 * Per track rather than per release, because that is what a credit describes —
 * the people who made *this recording*. A twelve-track album can have twelve
 * different producers.
 */
export function CreditsSheet({
  visible,
  title,
  contributors,
  pending,
  error,
  onCancel,
  onSave,
}: {
  visible: boolean;
  /** The track being credited, for the header. */
  title: string;
  contributors: { name: string; role: ContributorRole }[];
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (rows: ContributorInput[]) => void;
}) {
  const [drafts, setDrafts] = useState<Draft[]>(() => toDrafts(contributors));

  // Re-seeded when the sheet opens rather than on every render: reopening after
  // a cancel should show what is saved, not what was abandoned.
  useEffect(() => {
    if (visible) setDrafts(toDrafts(contributors));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function addRow(role: ContributorRole) {
    nextKey += 1;
    setDrafts((current) => [...current, { key: `new-${nextKey}`, name: '', role }]);
  }

  function setAt(key: string, patch: Partial<Draft>) {
    setDrafts((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function removeAt(key: string) {
    setDrafts((current) => current.filter((row) => row.key !== key));
  }

  // Blank rows are dropped rather than rejected: an empty row is someone who
  // changed their mind, not a mistake worth an error message.
  const filled = drafts.filter((row) => row.name.trim().length > 0);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel} transparent={false}>
      <SafeAreaView className="bg-ink flex-1" edges={['top', 'bottom']}>
        <View className="border-line-subtle flex-row items-center justify-between border-b px-4 py-3">
          <Pressable onPress={onCancel} accessibilityRole="button" hitSlop={12}>
            <Text className="font-outfit text-body text-muted">Cancel</Text>
          </Pressable>

          <Text numberOfLines={1} className="font-outfit-semibold text-body text-fg mx-3 flex-1 text-center">
            Credits
          </Text>

          <Pressable
            onPress={() => onSave(filled.map(({ name, role }) => ({ name: name.trim(), role })))}
            disabled={pending}
            accessibilityRole="button"
            hitSlop={12}>
            {pending ? (
              <ActivityIndicator color={Brand.blueOnInk} />
            ) : (
              <Text className="font-outfit-semibold text-body text-blue-ink">Save</Text>
            )}
          </Pressable>
        </View>

        <KeyboardScroll contentContainerClassName="gap-5 px-4 py-5">
          <View className="gap-1">
            <Text numberOfLines={1} className="font-outfit-semibold text-heading text-fg">
              {title}
            </Text>
            <Text className="font-outfit text-callout text-muted">
              The people who made this recording. Credits are shown by stores but never change the
              title or whose artist page the release appears on.
            </Text>
          </View>

          {error ? (
            <View className="border-danger/40 bg-danger/10 rounded-card border px-4 py-3">
              <Text className="font-outfit text-callout text-danger">{error}</Text>
            </View>
          ) : null}

          {drafts.map((row, index) => (
            <Animated.View
              key={row.key}
              entering={FadeInDown.delay(index * 40).duration(280)}
              className="bg-ink-raised rounded-card gap-3 p-4">
              <View className="flex-row items-center gap-3">
                <TextInput
                  value={row.name}
                  onChangeText={(name) => setAt(row.key, { name })}
                  placeholder="Their name"
                  placeholderTextColor={Brand.muted}
                  autoCapitalize="words"
                  editable={!pending}
                  className="font-outfit text-body text-fg flex-1"
                />
                <Pressable
                  onPress={() => removeAt(row.key)}
                  disabled={pending}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${row.name || 'this credit'}`}
                  hitSlop={10}
                  className="active:opacity-60">
                  <Ionicons name="close-circle-outline" size={20} color={Brand.muted} />
                </Pressable>
              </View>

              <RoleChips
                value={row.role ?? 'PRODUCER'}
                onChange={(role) => setAt(row.key, { role })}
                disabled={pending}
              />

              {ROLE_HINT[row.role ?? 'PRODUCER'] ? (
                <Text className="font-outfit text-caption text-muted">
                  {ROLE_HINT[row.role ?? 'PRODUCER']}
                </Text>
              ) : null}
            </Animated.View>
          ))}

          <Pressable
            onPress={() => addRow('PRODUCER')}
            disabled={pending}
            accessibilityRole="button"
            className="border-line rounded-card flex-row items-center justify-center gap-2 border border-dashed py-4 active:opacity-70">
            <Ionicons name="add" size={18} color={Brand.blueOnInk} />
            <Text className="font-outfit-semibold text-label text-fg">Add a credit</Text>
          </Pressable>

          {drafts.length === 0 ? (
            <Text className="font-outfit text-caption text-muted text-center">
              Optional, and you can add them later — but songwriter and composer are what
              publishing royalties are matched on, so they are worth filling in.
            </Text>
          ) : null}
        </KeyboardScroll>
      </SafeAreaView>
    </Modal>
  );
}
