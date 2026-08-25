import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';

/**
 * Whether the page has scrolled past `threshold`.
 *
 * The two bounds are deliberately apart: a single threshold flickers the header
 * on and off when a finger rests near it, because every jitter of a pixel
 * crosses the line. Coming back up has to travel further than going down did.
 */
export function useScrolledPast(threshold: number) {
  const [scrolled, setScrolled] = useState(false);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      setScrolled((current) => (current ? y > threshold * 0.6 : y > threshold));
    },
    [threshold]
  );

  return { scrolled, onScroll };
}

/**
 * The pinned top bar.
 *
 * Every screen with a back or close control uses this, and it always sits
 * outside the scroll view. Back scrolling away with the content left no way off
 * a long release without flicking all the way to the top first.
 *
 * `floating` is for the release page, where the header sits over the blurred
 * artwork: it starts transparent and takes on the page ground once there is
 * content passing beneath it, so the artwork is never covered by a bar that has
 * nothing to separate.
 */
export function ScreenHeader({
  icon = 'chevron-back',
  label = 'Back',
  title,
  subtitle,
  onPress,
  right,
  floating = false,
  scrolled = false,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label?: string;
  title?: string;
  subtitle?: string;
  onPress: () => void;
  right?: React.ReactNode;
  floating?: boolean;
  scrolled?: boolean;
}) {
  const insets = useSafeAreaInsets();

  // Opacity rather than a conditional render, so the ground arrives with the
  // scroll instead of snapping in.
  const ground = useRef(new Animated.Value(floating ? 0 : 1)).current;

  useEffect(() => {
    if (!floating) return;
    Animated.timing(ground, {
      toValue: scrolled ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [floating, scrolled, ground]);

  const titleShown = Boolean(title) && (!floating || scrolled);

  return (
    <View
      // Absolute only when floating: elsewhere it is a real row and the content
      // below it should start underneath, not behind.
      className={floating ? 'absolute top-0 right-0 left-0 z-10' : 'z-10'}
      style={{ paddingTop: insets.top }}>
      <Animated.View
        pointerEvents="none"
        className="border-line-subtle bg-ink absolute inset-0 border-b"
        style={{ opacity: ground }}
      />

      <View className="flex-row items-center gap-4 px-4 pt-4 pb-4">
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={label}
          hitSlop={12}
          className="active:opacity-60">
          <Ionicons name={icon} size={26} color={Brand.white} />
        </Pressable>

        <View className="flex-1">
          {titleShown ? (
            <Text className="font-outfit-bold text-title text-fg" numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {titleShown && subtitle ? (
            <Text className="font-outfit text-label text-muted" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {right}
      </View>
    </View>
  );
}
