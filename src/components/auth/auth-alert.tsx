import { useEffect } from 'react';
import { AccessibilityInfo, Platform, Pressable, Text, View } from 'react-native';

interface AuthAlertProps {
  /**
   * Every message to show. Nulls are dropped, so a screen can pass several
   * sources — its own form error and the Google hook's — without picking one.
   * `formError ?? google.error` silently discarded the second whenever both
   * were set.
   */
  messages: (string | null | undefined)[];
  /**
   * Renders a retry action. Offer it only when trying again could plausibly
   * succeed: an unreachable server, not a rejected password.
   */
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * The form-level error banner.
 *
 * Rendering red text is not enough on its own — a screen reader has no reason
 * to move to a box that simply appeared, so the banner announces itself.
 */
export function AuthAlert({ messages, onRetry, retryLabel = 'Try again' }: AuthAlertProps) {
  const shown = messages.filter((message): message is string => Boolean(message));
  const spoken = shown.join('. ');

  // TalkBack reads an Android live region by itself; VoiceOver has no
  // equivalent and stays silent, so iOS is announced explicitly.
  useEffect(() => {
    if (spoken && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(spoken);
  }, [spoken]);

  if (shown.length === 0) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className="border-l-danger bg-ink-raised rounded-card gap-2 border-l-[3px] p-4">
      {shown.map((message) => (
        <Text key={message} className="font-outfit text-callout text-danger">
          {message}
        </Text>
      ))}

      {onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          hitSlop={12}
          className="self-start pt-1">
          <Text className="font-outfit-semibold text-callout text-blue-ink">{retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
