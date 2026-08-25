import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { formatDuration } from '@/features/catalogue/detail';
import type { DetailTrack } from '@/features/catalogue/types';

/** Every row is this tall, which is what lets a drag translate into an index. */
const ROW = 68;
const GAP = 8;
const SLOT = ROW + GAP;

function move<T>(items: T[], from: number, to: number): T[] {
  const next = items.slice();
  const [lifted] = next.splice(from, 1);
  next.splice(to, 0, lifted);
  return next;
}

/**
 * Track order, dragged.
 *
 * A sheet of its own rather than handles on the edit-tracks list: those cards
 * expand into forms and audio dropzones, so they are not a uniform height, and
 * a drag starting inside one would be fighting the page's own scroll the whole
 * way. Stripped to one line per track, every row the same height, the geometry
 * is simple enough to be reliable — and the artist sees the running order as a
 * running order, which is the thing being decided.
 *
 * The arrows are not a fallback. A twelve-track album where track nine belongs
 * second is two taps away and a drag away, and the arrows are the half of that
 * pair a screen reader can actually use.
 */
export function ReorderSheet({
  visible,
  tracks,
  pending,
  error,
  onCancel,
  onSave,
}: {
  visible: boolean;
  tracks: DetailTrack[];
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  /** The full list of track ids in their new order. */
  onSave: (trackIds: string[]) => void;
}) {
  const [order, setOrder] = useState<DetailTrack[]>(tracks);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const lift = useRef(new Animated.Value(0)).current;
  // One value per track, kept across renders so a row animates from where it
  // is rather than jumping when the list re-renders mid-drag.
  const offsets = useRef(new Map<string, Animated.Value>()).current;

  // Seeded on the way open, and only then. Keying this off `tracks` as well
  // would throw away a half-finished reorder every time the edit screen's
  // processing poll returned a fresh array — same tracks, new identity.
  const wasVisible = useRef(false);
  if (visible && !wasVisible.current) {
    wasVisible.current = true;
    // Safe during render: React re-runs this pass rather than committing, and
    // an effect would let one frame of the stale order through first.
    setOrder(tracks);
    setDragIndex(null);
    setHoverIndex(null);
  } else if (!visible && wasVisible.current) {
    wasVisible.current = false;
  }

  function offsetFor(id: string) {
    let value = offsets.get(id);
    if (!value) {
      value = new Animated.Value(0);
      offsets.set(id, value);
    }
    return value;
  }

  // Every row that is not the lifted one slides by exactly one slot to open the
  // gap the lifted row would land in.
  useEffect(() => {
    order.forEach((track, index) => {
      let target = 0;
      if (dragIndex !== null && hoverIndex !== null && index !== dragIndex) {
        if (dragIndex < hoverIndex && index > dragIndex && index <= hoverIndex) target = -SLOT;
        if (dragIndex > hoverIndex && index < dragIndex && index >= hoverIndex) target = SLOT;
      }

      Animated.spring(offsetFor(track.id), {
        toValue: target,
        useNativeDriver: true,
        speed: 20,
        bounciness: 4,
      }).start();
    });
    // Only when the drag actually moves. Without the dependencies every render
    // restarted all of the springs from wherever they had reached.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, dragIndex, hoverIndex]);

  const dirty = useMemo(
    () => order.some((track, index) => track.id !== tracks[index]?.id),
    [order, tracks]
  );

  function nudge(index: number, direction: -1 | 1) {
    const to = index + direction;
    if (to < 0 || to >= order.length) return;
    setOrder((current) => move(current, index, to));
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Brand.ink }} edges={['top', 'bottom']}>
        <View className="flex-row items-center gap-4 px-5 py-4">
          <Pressable
            onPress={onCancel}
            disabled={pending}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            hitSlop={12}>
            <Ionicons name="close" size={26} color={Brand.white} />
          </Pressable>

          <View className="flex-1">
            <Text className="font-outfit-bold text-title text-fg">Running order</Text>
            <Text className="font-outfit text-label text-muted">
              Hold the handle to drag, or use the arrows.
            </Text>
          </View>

          <Pressable
            onPress={() => onSave(order.map((track) => track.id))}
            disabled={!dirty || pending}
            accessibilityRole="button"
            accessibilityState={{ disabled: !dirty, busy: pending }}
            hitSlop={12}>
            {pending ? (
              <ActivityIndicator color={Brand.blueOnInk} />
            ) : (
              <Text
                className={`font-outfit-semibold text-body ${
                  dirty ? 'text-blue-ink' : 'text-muted'
                }`}>
                Save
              </Text>
            )}
          </Pressable>
        </View>

        {error ? (
          <View className="border-danger-line bg-danger-surface rounded-card mx-5 mb-3 border p-3">
            <Text className="font-outfit text-callout text-danger">{error}</Text>
          </View>
        ) : null}

        <ScrollView
          // A drag and a scroll are the same gesture. Locking the page while a
          // row is lifted is what keeps them from competing.
          scrollEnabled={dragIndex === null}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: GAP }}
          showsVerticalScrollIndicator={false}>
          {order.map((track, index) => (
            <ReorderRow
              key={track.id}
              track={track}
              position={index + 1}
              first={index === 0}
              last={index === order.length - 1}
              dragging={dragIndex === index}
              lift={lift}
              offset={offsetFor(track.id)}
              disabled={pending}
              onNudge={(direction) => nudge(index, direction)}
              onDragStart={() => {
                setDragIndex(index);
                setHoverIndex(index);
                lift.setValue(0);
              }}
              onDragMove={(dy) => {
                lift.setValue(dy);
                const steps = Math.round(dy / SLOT);
                const next = Math.max(0, Math.min(order.length - 1, index + steps));
                setHoverIndex(next);
              }}
              onDragEnd={() => {
                const to = hoverIndex ?? index;
                setDragIndex(null);
                setHoverIndex(null);
                lift.setValue(0);
                // Reset every row's opened gap before the reordered list
                // renders, or the shift would be applied twice.
                offsets.forEach((value) => value.setValue(0));
                if (to !== index) setOrder((current) => move(current, index, to));
              }}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function ReorderRow({
  track,
  position,
  first,
  last,
  dragging,
  lift,
  offset,
  disabled,
  onNudge,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  track: DetailTrack;
  position: number;
  first: boolean;
  last: boolean;
  dragging: boolean;
  lift: Animated.Value;
  offset: Animated.Value;
  disabled: boolean;
  onNudge: (direction: -1 | 1) => void;
  onDragStart: () => void;
  onDragMove: (dy: number) => void;
  onDragEnd: () => void;
}) {
  // The handlers arrive as fresh closures on every render, and the parent
  // re-renders on every pixel of a drag. Reading them through a ref keeps the
  // responder itself built exactly once — rebuilding it mid-gesture swaps the
  // handlers out from under a grant that has already happened.
  const latest = useRef({ disabled, onDragStart, onDragMove, onDragEnd });
  latest.current = { disabled, onDragStart, onDragMove, onDragEnd };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !latest.current.disabled,
        onMoveShouldSetPanResponder: () => !latest.current.disabled,
        // Refuses to hand the gesture back to the scroll view mid-drag. Without
        // this the list can steal the responder on the first vertical pixel and
        // the row is dropped where it was picked up.
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => latest.current.onDragStart(),
        onPanResponderMove: (_event, gesture) => latest.current.onDragMove(gesture.dy),
        onPanResponderRelease: () => latest.current.onDragEnd(),
        onPanResponderTerminate: () => latest.current.onDragEnd(),
      }),
    []
  );

  return (
    <Animated.View
      style={{
        height: ROW,
        zIndex: dragging ? 10 : 0,
        elevation: dragging ? 10 : 0,
        transform: [{ translateY: dragging ? lift : offset }, { scale: dragging ? 1.02 : 1 }],
      }}>
      <View
        className={`rounded-card h-full flex-row items-center gap-3 border px-3 ${
          dragging ? 'border-blue bg-ink-high' : 'border-line-subtle bg-ink-raised'
        }`}>
        <View className="bg-ink-high h-[32px] w-[32px] items-center justify-center rounded-full">
          <Text className="font-outfit-semibold text-label text-muted">{position}</Text>
        </View>

        <View className="flex-1">
          <Text className="font-outfit-semibold text-body text-fg" numberOfLines={1}>
            {track.title}
            {track.versionTitle ? ` (${track.versionTitle})` : ''}
          </Text>
          <Text className="font-outfit text-caption text-muted" numberOfLines={1}>
            {formatDuration(track.durationSec) ?? 'No audio yet'}
          </Text>
        </View>

        <View className="flex-row items-center">
          <Pressable
            onPress={() => onNudge(-1)}
            disabled={first || disabled}
            accessibilityRole="button"
            accessibilityLabel={`Move ${track.title} up`}
            hitSlop={6}
            className="h-[32px] w-[28px] items-center justify-center">
            <Ionicons name="chevron-up" size={18} color={first ? Brand.border : Brand.blueOnInk} />
          </Pressable>
          <Pressable
            onPress={() => onNudge(1)}
            disabled={last || disabled}
            accessibilityRole="button"
            accessibilityLabel={`Move ${track.title} down`}
            hitSlop={6}
            className="h-[32px] w-[28px] items-center justify-center">
            <Ionicons name="chevron-down" size={18} color={last ? Brand.border : Brand.blueOnInk} />
          </Pressable>
        </View>

        <View
          {...responder.panHandlers}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`Reorder ${track.title}, position ${position}`}
          className="h-full w-[36px] items-center justify-center">
          <Ionicons name="reorder-three" size={24} color={Brand.muted} />
        </View>
      </View>
    </Animated.View>
  );
}
