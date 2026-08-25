import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';

export interface SheetAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  /** Draws it as already handled — a tick, and the row reads back rather than forward. */
  done?: boolean;
  onPress: () => void;
}

/**
 * The sheet that says what to do next.
 *
 * Landing on a release straight after creating it, or straight after submitting
 * it, leaves an artist on a screen full of everything at once with no signal
 * which part is theirs to act on. This names the next move — and only the next
 * move — over the screen it applies to, so the answer arrives without a
 * detour through another page.
 *
 * Not a `PickerSheet`: that one is a full-height page sheet for choosing from a
 * list. This is short, sits over the release, and closes to reveal it.
 */
export function ActionSheet({
  visible,
  eyebrow,
  title,
  body,
  actions = [],
  dismissLabel = 'Not now',
  tone = 'blue',
  onClose,
}: {
  visible: boolean;
  eyebrow?: string;
  title: string;
  body: string;
  actions?: SheetAction[];
  dismissLabel?: string;
  /** `positive` for something that has just gone right, `blue` for work to do. */
  tone?: 'blue' | 'positive';
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const accent = tone === 'positive' ? Brand.positive : Brand.blueOnInk;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* The scrim is the dismiss target, so tapping the release behind the
          sheet does the obvious thing. */}
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        className="flex-1 justify-end bg-black/60">
        {/* Swallows taps that land on the sheet itself — without this every tap
            inside it would close the sheet on the way through. */}
        <Pressable
          onPress={() => {}}
          accessibilityRole="none"
          className="bg-ink-raised gap-4 rounded-t-[24px] px-5 pt-3"
          style={{ paddingBottom: insets.bottom + 20 }}>
          <View className="bg-ink-high h-[4px] w-[36px] self-center rounded-full" />

          <View className="gap-2 pt-2">
            {eyebrow ? (
              <Text
                className={`font-outfit-medium text-caption ${
                  tone === 'positive' ? 'text-positive' : 'text-blue-ink'
                }`}>
                {eyebrow}
              </Text>
            ) : null}
            <Text className="font-outfit-bold text-title text-fg">{title}</Text>
            <Text className="font-outfit text-body text-muted">{body}</Text>
          </View>

          {actions.length > 0 ? (
            <View className="gap-2">
              {actions.map((action, index) => (
                <Animated.View
                  key={action.label}
                  entering={FadeInDown.delay(60 + index * 50).duration(280)}>
                  <Pressable
                    onPress={action.onPress}
                    accessibilityRole="button"
                    accessibilityState={{ checked: action.done }}
                    className={`rounded-card flex-row items-center gap-3 border p-4 ${
                      action.done
                        ? 'border-line-subtle bg-ink active:bg-ink-high'
                        : 'border-blue-line bg-blue-surface active:bg-ink-high'
                    }`}>
                    <View
                      className={`h-[40px] w-[40px] items-center justify-center rounded-full ${
                        action.done ? 'bg-ink-high' : 'bg-ink-raised'
                      }`}>
                      <Ionicons
                        name={action.done ? 'checkmark' : action.icon}
                        size={20}
                        color={action.done ? Brand.positive : accent}
                      />
                    </View>

                    <View className="flex-1 gap-1">
                      <Text
                        className={`font-outfit-semibold text-body ${
                          action.done ? 'text-muted' : 'text-fg'
                        }`}>
                        {action.label}
                      </Text>
                      {action.hint ? (
                        <Text className="font-outfit text-label text-muted">{action.hint}</Text>
                      ) : null}
                    </View>

                    {action.done ? null : (
                      <Ionicons name="chevron-forward" size={18} color={Brand.muted} />
                    )}
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          ) : null}

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            className="rounded-button active:bg-ink-high min-h-[52px] items-center justify-center py-4">
            <Text className="font-outfit-semibold text-body text-muted">{dismissLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
