import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Brand } from '@/constants/brand';

function elapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * The scrubber. A tappable bar rather than a real slider — a draggable thumb
 * would mean another native dependency for a control used to spot-check a
 * master, and tap-to-seek covers what an artist listening back actually does.
 */
export function Scrubber({
  position,
  duration,
  onSeek,
}: {
  position: number;
  duration: number;
  onSeek: (seconds: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const fraction = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <View className="gap-1">
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="Seek"
        hitSlop={10}
        onPress={(event) => {
          // `locationX` is relative to the bar, so turning it into a time needs
          // the bar's measured width.
          if (width > 0 && duration > 0) {
            onSeek((event.nativeEvent.locationX / width) * duration);
          }
        }}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        <View className="bg-ink-high h-[4px] overflow-hidden rounded-full">
          <View className="bg-blue h-full rounded-full" style={{ width: `${fraction * 100}%` }} />
        </View>
      </Pressable>

      <View className="flex-row justify-between">
        <Text className="font-outfit text-caption text-muted">{elapsed(position)}</Text>
        <Text className="font-outfit text-caption text-muted">{elapsed(duration)}</Text>
      </View>
    </View>
  );
}

/** Play, pause, or the wait while a fresh presigned URL is fetched. */
export function PlayButton({
  playing,
  loading,
  label,
  size = 40,
  onPress,
}: {
  playing: boolean;
  loading?: boolean;
  label: string;
  size?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={playing ? `Pause ${label}` : `Play ${label}`}
      accessibilityState={{ busy: loading }}
      className="bg-blue active:bg-blue-pressed items-center justify-center rounded-full"
      style={{ height: size, width: size }}>
      {loading ? (
        <ActivityIndicator color={Brand.white} size="small" />
      ) : (
        <Ionicons name={playing ? 'pause' : 'play'} size={size * 0.45} color={Brand.white} />
      )}
    </Pressable>
  );
}
