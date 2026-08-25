import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Switch, Text, View } from 'react-native';

import { useThemeColors } from '@/features/theme/theme';

/**
 * A group of rows under a heading.
 *
 * The card carries the border and the rows inside carry hairlines, so a section
 * reads as one object rather than as a stack of separate strips.
 */
export function SettingsSection({
  title,
  footnote,
  children,
}: {
  title?: string;
  footnote?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-2">
      {title ? (
        <Text className="font-outfit-semibold text-caption text-muted uppercase">{title}</Text>
      ) : null}

      <View className="rounded-card border-line-subtle bg-ink-raised overflow-hidden border">
        {children}
      </View>

      {footnote ? (
        <Text className="font-outfit-regular text-label text-muted">{footnote}</Text>
      ) : null}
    </View>
  );
}

/** A row that goes somewhere. */
export function SettingsLink({
  icon,
  label,
  value,
  onPress,
  destructive = false,
  first = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  destructive?: boolean;
  /** Suppresses the top hairline on the first row of a section. */
  first?: boolean;
}) {
  const colors = useThemeColors();
  const tint = destructive ? colors.danger : colors.blueOnInk;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      className={`flex-row items-center gap-3 px-4 py-3.5 active:opacity-70 ${
        first ? '' : 'border-line-subtle border-t'
      }`}>
      <Ionicons name={icon} size={19} color={tint} />

      <Text
        className={`font-outfit-medium text-body flex-1 ${
          destructive ? 'text-danger' : 'text-fg'
        }`}>
        {label}
      </Text>

      {value ? (
        <Text className="font-outfit-regular text-label text-muted">{value}</Text>
      ) : null}

      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

/** A row that toggles something. */
export function SettingsSwitch({
  icon,
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  first = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  first?: boolean;
}) {
  const colors = useThemeColors();

  return (
    <View
      className={`flex-row items-center gap-3 px-4 py-3.5 ${
        first ? '' : 'border-line-subtle border-t'
      }`}>
      <Ionicons name={icon} size={19} color={colors.blueOnInk} />

      <View className="min-w-0 flex-1">
        <Text className="font-outfit-medium text-body text-fg">{label}</Text>
        {description ? (
          <Text className="font-outfit-regular text-label text-muted mt-0.5">{description}</Text>
        ) : null}
      </View>

      {/* Every colour here is prop-shaped — `className` reaches none of it. */}
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.line, true: colors.blue }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.line}
      />
    </View>
  );
}

/** A row that is one of a set — the appearance choices. */
export function SettingsChoice({
  icon,
  label,
  description,
  selected,
  onPress,
  first = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  first?: boolean;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      className={`flex-row items-center gap-3 px-4 py-3.5 active:opacity-70 ${
        first ? '' : 'border-line-subtle border-t'
      }`}>
      <Ionicons name={icon} size={19} color={selected ? colors.blueOnInk : colors.muted} />

      <View className="min-w-0 flex-1">
        <Text className="font-outfit-medium text-body text-fg">{label}</Text>
        {description ? (
          <Text className="font-outfit-regular text-label text-muted mt-0.5">{description}</Text>
        ) : null}
      </View>

      {selected ? (
        <Ionicons name="checkmark-circle" size={20} color={colors.blue} />
      ) : (
        <View className="border-line h-[20px] w-[20px] rounded-full border" />
      )}
    </Pressable>
  );
}
