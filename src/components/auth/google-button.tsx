import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { GoogleMark } from '@/components/auth/google-mark';
import { Brand } from '@/constants/brand';

interface GoogleButtonProps {
  label: string;
  onPress: () => void;
  pending?: boolean;
  disabled?: boolean;
}

/**
 * Secondary styling on purpose: email is the primary path, and two solid
 * buttons stacked would read as two equal choices.
 */
export function GoogleButton({
  label,
  onPress,
  pending = false,
  disabled = false,
}: GoogleButtonProps) {
  const blocked = pending || disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: blocked, busy: pending }}
      // `min-h` matches AuthButton so the two never disagree by a pixel when stacked.
      className={`rounded-button border-line active:bg-ink-raised min-h-[52px] items-center justify-center border bg-transparent py-4 ${
        blocked ? 'opacity-50' : ''
      }`}>
      {pending ? (
        <ActivityIndicator color={Brand.text} />
      ) : (
        <View className="flex-row items-center gap-2">
          {/* Google's guidelines require the mark on a white field, so it keeps
              its own chip rather than sitting straight on the ink button. */}
          <View className="h-[22px] w-[22px] items-center justify-center rounded-full bg-white">
            <GoogleMark size={18} />
          </View>
          <Text className="font-outfit-semibold text-body text-fg">{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** The "or" rule between the email form and the social buttons. */
export function AuthDivider({ label = 'or' }: { label?: string }) {
  return (
    <View className="flex-row items-center gap-4">
      {/* `hairlineWidth` is a runtime value — there is no class for it. */}
      <View className="bg-line flex-1" style={{ height: StyleSheet.hairlineWidth }} />
      <Text className="font-outfit text-label text-muted">{label}</Text>
      <View className="bg-line flex-1" style={{ height: StyleSheet.hairlineWidth }} />
    </View>
  );
}
