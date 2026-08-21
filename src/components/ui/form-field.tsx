import Ionicons from '@expo/vector-icons/Ionicons';
import { forwardRef, useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Brand } from '@/constants/brand';

/** Marks a field the submission checklist blocks on. */
function RequiredChip() {
  return (
    <View className="border-violet-line bg-violet-surface rounded-full border px-2 py-[2px]">
      <Text className="font-outfit-medium text-caption text-violet-ink">Required to submit</Text>
    </View>
  );
}

function Label({
  label,
  required,
  count,
}: {
  label: string;
  required?: boolean;
  count?: { current: number; max: number };
}) {
  // Only near the cap. A counter on an empty field is noise; a counter at 184
  // of 200 is a warning worth having before the server rejects it.
  const showCount = count && count.current > count.max * 0.8;

  return (
    <View className="flex-row items-center gap-2">
      <Text className="font-outfit-semibold text-label text-muted flex-1 tracking-[0.2px]">
        {label}
      </Text>
      {showCount ? (
        <Text
          className={`font-outfit-medium text-caption ${
            count.current > count.max ? 'text-danger' : 'text-muted'
          }`}>
          {count.current}/{count.max}
        </Text>
      ) : null}
      {required ? <RequiredChip /> : null}
    </View>
  );
}

export type FormFieldProps = TextInputProps & {
  label: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  maxCount?: number;
};

/** A text input for the catalogue forms. Mirrors `AuthField`, minus the eye. */
export const FormField = forwardRef<TextInput, FormFieldProps>(function FormField(
  { label, error, hint, required, maxCount, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  const borderClass = error ? 'border-danger' : focused ? 'border-violet' : 'border-line';
  const value = typeof rest.value === 'string' ? rest.value : '';

  return (
    <View className="gap-2">
      <Label
        label={label}
        required={required}
        count={maxCount ? { current: value.length, max: maxCount } : undefined}
      />

      <View className={`rounded-field bg-ink-field border px-4 ${borderClass}`}>
        <TextInput
          {...rest}
          ref={ref}
          className="font-outfit text-body text-fg py-[14px]"
          placeholderTextColor={Brand.muted}
          selectionColor={Brand.blue}
          accessibilityLabel={
            rest.accessibilityLabel ?? (error ? `${label}, error: ${error}` : label)
          }
          onFocus={(event) => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
        />
      </View>

      {error ? (
        <Text className="font-outfit text-label text-danger">{error}</Text>
      ) : hint ? (
        <Text className="font-outfit text-label text-muted">{hint}</Text>
      ) : null}
    </View>
  );
});

/**
 * A field that opens something instead of accepting typing — a picker sheet, a
 * date picker. Looks identical to {@link FormField} so a form of both does not
 * read as two different kinds of control.
 */
export function SelectField({
  label,
  value,
  placeholder,
  error,
  hint,
  required,
  disabled,
  onPress,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <View className="gap-2">
      <Label label={label} required={required} />

      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value ?? placeholder}`}
        className={`rounded-field bg-ink-field active:bg-ink-high flex-row items-center justify-between border px-4 py-[15px] ${
          error ? 'border-danger' : 'border-line'
        } ${disabled ? 'opacity-50' : ''}`}>
        <Text className={`font-outfit text-body ${value ? 'text-fg' : 'text-muted'}`}>
          {value ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Brand.muted} />
      </Pressable>

      {error ? (
        <Text className="font-outfit text-label text-danger">{error}</Text>
      ) : hint ? (
        <Text className="font-outfit text-label text-muted">{hint}</Text>
      ) : null}
    </View>
  );
}
