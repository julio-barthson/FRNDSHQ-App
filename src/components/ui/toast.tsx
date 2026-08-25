import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
}

/**
 * How long each tone stays.
 *
 * An error outlives a success on purpose: a confirmation is read in a glance
 * and a failure has to be read properly, sometimes twice.
 */
const DURATION: Record<ToastTone, number> = {
  success: 3200,
  info: 3600,
  error: 5600,
};

const LOOK: Record<ToastTone, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { icon: 'checkmark-circle', color: Brand.positive },
  error: { icon: 'alert-circle', color: Brand.danger },
  info: { icon: 'information-circle', color: Brand.blueOnInk },
};

/** At most this many at once — past three it is a wall, not a message. */
const MAX_VISIBLE = 3;

interface ToastApi {
  show: (tone: ToastTone, title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Transient messages, over everything.
 *
 * The rule this follows, and it is the same one the admin console follows:
 * **toast outcomes, never anything the reader has to act on.** A save
 * succeeding, an upload finishing, a request failing on the network — those are
 * outcomes, and they belong here. A field that is filled in wrong, or a screen
 * that could not load at all, stays on the page where the fix is: a message
 * that fades on a timer is no use to someone who has to do something about it.
 *
 * Tap dismisses. There is no swipe, because that would need
 * `react-native-gesture-handler`, and a new native module means a rebuild —
 * see the dev gotchas. Tap and a timer cover it.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const insets = useSafeAreaInsets();

  // Kept in a ref so dismissing clears the right timer even after re-renders.
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      setToasts((current) => [...current, { id, tone, title, description }].slice(-MAX_VISIBLE));

      // TalkBack reads a live region by itself; VoiceOver has no equivalent and
      // stays silent, so iOS is announced explicitly — the same split the auth
      // alert makes.
      if (Platform.OS === 'ios') {
        AccessibilityInfo.announceForAccessibility(
          description ? `${title}. ${description}` : title
        );
      }

      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATION[tone])
      );
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (title, description) => show('success', title, description),
      error: (title, description) => show('error', title, description),
      info: (title, description) => show('info', title, description),
      dismiss,
    }),
    [show, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* `pointerEvents="box-none"` so the stack never swallows a tap meant for
          the screen underneath — only the cards themselves are touchable. */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: insets.top + 8,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          gap: 8,
        }}
        accessibilityLiveRegion="polite">
        {toasts.map((toast) => {
          const look = LOOK[toast.tone];

          return (
            <Animated.View
              key={toast.id}
              entering={FadeInUp.springify().damping(18).stiffness(180)}
              exiting={FadeOutUp.duration(180)}
              layout={LinearTransition.springify().damping(18)}
              // Plain style, not `className`: NativeWind rewrites imports of
              // `react-native`, not of reanimated, so a class on this wrapper
              // would be dropped. The card inside carries the look.
              style={{
                shadowColor: '#000',
                shadowOpacity: 0.4,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 6 },
                elevation: 8,
              }}>
              <Pressable
                onPress={() => dismiss(toast.id)}
                accessibilityRole="button"
                accessibilityLabel={`${toast.title}. Dismiss`}
                className="rounded-card border-line bg-ink-high flex-row items-start gap-3 border p-4 active:opacity-90">
                <Ionicons name={look.icon} size={20} color={look.color} />

                <View className="min-w-0 flex-1">
                  <Text className="font-outfit-semibold text-label text-fg">{toast.title}</Text>
                  {toast.description ? (
                    <Text className="font-outfit-regular text-label mt-0.5 text-muted">
                      {toast.description}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

/**
 * Never throws when the provider is missing.
 *
 * A screen rendered outside it — a test, or a route mounted before the shell —
 * should lose its toasts, not crash. The no-op keeps call sites free of
 * defensive checks.
 */
export function useToast(): ToastApi {
  const context = useContext(ToastContext);

  return (
    context ?? {
      show: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      dismiss: () => {},
    }
  );
}
