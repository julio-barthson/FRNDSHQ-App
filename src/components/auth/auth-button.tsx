import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

import { Brand } from '@/constants/brand';

export type AuthButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  /** Swaps the label for a spinner and blocks presses. */
  pending?: boolean;
  /**
   * `secondary` outlines rather than fills, so two buttons can sit together
   * without competing for the press — the welcome screen stacks one of each.
   */
  variant?: 'primary' | 'secondary';
  /** Layout only — spacing the caller needs, not a restyle of the button. */
  className?: string;
};

export function AuthButton({
  label,
  pending = false,
  variant = 'primary',
  disabled,
  className,
  ...rest
}: AuthButtonProps) {
  const secondary = variant === 'secondary';
  const blocked = pending || disabled;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!blocked, busy: pending }}
      disabled={blocked}
      className={[
        // `min-h` holds the row height steady when the label swaps for the spinner.
        'rounded-button min-h-[52px] items-center justify-center py-4',
        secondary
          ? 'border-line active:bg-ink-raised border bg-transparent'
          : 'bg-blue active:bg-blue-pressed',
        blocked ? 'opacity-50' : '',
        className ?? '',
      ].join(' ')}
      {...rest}>
      {pending ? (
        // `color` is a prop, not a style — `className` cannot reach it.
        <ActivityIndicator color={secondary ? Brand.text : Brand.white} />
      ) : (
        <Text
          className={
            secondary
              ? 'font-outfit-bold text-body text-white'
              : 'font-outfit-bold text-body text-white'
          }>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
