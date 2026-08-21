import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { COUNTRIES, type Country } from '@/constants/countries';

interface CountryPickerProps {
  visible: boolean;
  selectedCode: string;
  onSelect: (country: Country) => void;
  onClose: () => void;
}

export function CountryPicker({ visible, selectedCode, onSelect, onClose }: CountryPickerProps) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return COUNTRIES;

    // Match the name, the ISO code, or the dial code typed with or without `+`.
    const dial = trimmed.replace(/^\+/, '');
    return COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(trimmed) ||
        country.code.toLowerCase() === trimmed ||
        country.dialCode.startsWith(dial)
    );
  }, [query]);

  function choose(country: Country) {
    onSelect(country);
    setQuery('');
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      {/* `className` does not reach `SafeAreaView` — react-native-css re-exports it
          untouched, so the ground and flex have to be styles. */}
      <SafeAreaView style={{ flex: 1, backgroundColor: Brand.ink }} edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between px-6 py-4">
          <Text className="font-outfit-bold text-fg text-[18px]">Select country</Text>
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
            <Text className="font-outfit-semibold text-body text-blue-ink">Done</Text>
          </Pressable>
        </View>

        <View className="px-6 pb-4">
          <TextInput
            className="rounded-field border-line bg-ink-field font-outfit text-body text-fg min-h-12 border px-4 py-[10px]"
            value={query}
            onChangeText={setQuery}
            placeholder="Search country or code"
            placeholderTextColor={Brand.muted}
            selectionColor={Brand.blue}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        <FlatList
          data={results}
          keyExtractor={(country) => country.code}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="px-6 pb-8"
          ListEmptyComponent={
            <Text className="font-outfit text-muted py-6 text-center text-[15px]">
              No matching country.
            </Text>
          }
          renderItem={({ item }) => {
            const selected = item.code === selectedCode;
            return (
              <Pressable
                onPress={() => choose(item)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className="border-b-line active:bg-ink-raised flex-row items-center gap-4 py-4"
                style={{ borderBottomWidth: StyleSheet.hairlineWidth }}>
                <Text className="font-outfit text-body text-fg flex-1" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="font-outfit text-muted text-[15px]">+{item.dialCode}</Text>
                {selected && <Text className="font-outfit-bold text-body text-blue-ink">✓</Text>}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}
