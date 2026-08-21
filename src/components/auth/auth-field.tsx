import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { forwardRef, useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Brand } from '@/constants/brand';

export type AuthFieldProps = TextInputProps & {
  label: string;
  /** Shown under the field, and turns the border red. */
  error?: string | null;
  /** Renders an eye toggle that reveals the value, and starts obscured. */
  secure?: boolean;
};

/**
 * The auth screens sit on ink regardless of colour scheme, so this field does
 * not go through a theme hook — the classes name the ink surfaces directly.
 */
export const AuthField = forwardRef<TextInput, AuthFieldProps>(function AuthField(
  { label, error, secure = false, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderClass = error ? 'border-danger' : focused ? 'border-line-focus' : 'border-line';

  return (
    <View className="gap-2">
      <Text className="font-outfit-semibold text-label text-muted tracking-[0.2px]">{label}</Text>

      <View
        className={`rounded-field bg-ink-field flex-row items-center gap-2 border px-4 ${borderClass}`}>
        <TextInput
          // Spread first: the props below own the focus ring and the reveal
          // state, so a caller's `onFocus` must not be able to replace them.
          {...rest}
          ref={ref}
          // Vertical padding rather than a fixed height so the field grows with
          // the user's font-size setting instead of clipping the text.
          className="font-outfit text-body text-fg min-h-12 flex-1 py-[18px]"
          placeholderTextColor={Brand.muted}
          selectionColor={Brand.blue}
          secureTextEntry={secure && !revealed}
          // React Native 0.81 has no `aria-invalid`, so the message is folded
          // into the label instead. Without this a screen reader reads the
          // field and never learns that what is in it was rejected.
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

        {secure && (
          <Pressable
            onPress={() => setRevealed((value) => !value)}
            // The icon is only 20pt, so the slop carries the touch target the
            // rest of the way to a comfortable size.
            hitSlop={16}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}>
            {/* The icon names the action, not the state: a struck-through eye
                while the password is on screen means "tap to hide it". */}
            <MaterialIcons
              name={revealed ? 'visibility-off' : 'visibility'}
              size={20}
              color={Brand.muted}
            />
          </Pressable>
        )}
      </View>

      {error ? <Text className="font-outfit text-label text-danger">{error}</Text> : null}
    </View>
  );
});
