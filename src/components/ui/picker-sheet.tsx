import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptySearch } from '@/components/ui/illustrations';
import { Brand } from '@/constants/brand';

export interface PickerOption {
  /** What gets stored. */
  value: string;
  /** What gets shown. */
  label: string;
  /** Optional second line — a language code, a dial code. */
  hint?: string;
}

/**
 * A searchable list in a sheet, for fields with a fixed vocabulary.
 *
 * Genres and languages are both long enough that a plain list is a scroll hunt
 * — 46 genres, 30 languages — and both must come from a fixed set, because a
 * distributor has to map whatever is stored onto each DSP's own taxonomy and
 * free text makes that impossible.
 */
export function PickerSheet({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  allowClear = false,
}: {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  onClose: () => void;
  /** Adds a "None" row, for optional fields. */
  allowClear?: boolean;
}) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(trimmed) ||
        option.value.toLowerCase().includes(trimmed) ||
        option.hint?.toLowerCase().includes(trimmed)
    );
  }, [options, query]);

  function choose(value: string | null) {
    onSelect(value);
    setQuery('');
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Brand.ink }} edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between px-6 py-4">
          <Text className="font-outfit-bold text-fg text-[18px]">{title}</Text>
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={12}>
            <Text className="font-outfit-semibold text-body text-violet-ink">Done</Text>
          </Pressable>
        </View>

        <View className="px-6 pb-4">
          <View className="rounded-field border-line bg-ink-field flex-row items-center gap-2 border px-4">
            <Ionicons name="search" size={18} color={Brand.muted} />
            <TextInput
              className="font-outfit text-body text-fg flex-1 py-[12px]"
              value={query}
              onChangeText={setQuery}
              placeholder={`Search ${title.toLowerCase()}`}
              placeholderTextColor={Brand.muted}
              selectionColor={Brand.blue}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel={`Search ${title.toLowerCase()}`}
            />
          </View>
        </View>

        <FlatList
          data={results}
          keyExtractor={(option) => option.value}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="px-6 pb-8"
          ListHeaderComponent={
            allowClear && !query.trim() ? (
              <Pressable
                onPress={() => choose(null)}
                accessibilityRole="button"
                accessibilityState={{ selected: selected === null }}
                className="active:bg-ink-raised flex-row items-center gap-4 py-4"
                style={{
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: Brand.border,
                }}>
                <Text className="font-outfit text-body text-muted flex-1">None</Text>
                {selected === null ? (
                  <Ionicons name="checkmark" size={18} color={Brand.violetInk} />
                ) : null}
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center gap-2 py-8">
              <EmptySearch size={100} />
              <Text className="font-outfit text-callout text-muted">Nothing matches.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isSelected = item.value === selected;
            return (
              <Pressable
                onPress={() => choose(item.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                className="active:bg-ink-raised flex-row items-center gap-4 py-4"
                style={{
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: Brand.border,
                }}>
                <View className="flex-1">
                  <Text className="font-outfit text-body text-fg" numberOfLines={1}>
                    {item.label}
                  </Text>
                  {item.hint ? (
                    <Text className="font-outfit text-label text-muted">{item.hint}</Text>
                  ) : null}
                </View>
                {isSelected ? (
                  <Ionicons name="checkmark" size={18} color={Brand.violetInk} />
                ) : null}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}
