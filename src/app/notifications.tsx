import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthAlert } from '@/components/auth/auth-alert';
import { ScreenHeader } from '@/components/ui/screen-header';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/api';
import type { AppNotification, NotificationType } from '@/features/notifications/types';
import { Brand } from '@/constants/brand';

const PAGE_SIZE = 20;

/**
 * The glyph and tone for each kind. `REVIEW_QUEUE_NEW` is addressed to
 * administrators and should never reach this screen, but it is mapped anyway —
 * a missing key here would render an empty circle rather than fail loudly.
 */
const LOOK: Record<NotificationType, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  RELEASE_SUBMITTED: { icon: 'paper-plane-outline', color: Brand.blueOnInk },
  RELEASE_APPROVED: { icon: 'checkmark-circle-outline', color: Brand.positive },
  RELEASE_REJECTED: { icon: 'arrow-undo-outline', color: Brand.danger },
  REVIEW_QUEUE_NEW: { icon: 'albums-outline', color: Brand.blueOnInk },
};

/** How long ago, in the units a person would say it in. */
function relative(iso: string): string {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return '';

  const seconds = Math.round((Date.now() - value.getTime()) / 1000);
  if (seconds < 60) return 'Just now';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? 'Yesterday' : `${days} days ago`;

  return value.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function NotificationsScreen() {
  const router = useRouter();

  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Refs rather than state, for the same reason the releases list uses them:
  // `onEndReached` fires from a gesture handler that closed over an old render,
  // so reading page from state there would page backwards.
  const pageRef = useRef(1);
  const totalPagesRef = useRef(1);

  const fetchPage = useCallback(async (page: number, mode: 'replace' | 'append') => {
    try {
      const result = await listNotifications(page, PAGE_SIZE);

      pageRef.current = result.page;
      totalPagesRef.current = result.totalPages;

      setUnread(result.unread);
      setItems((current) =>
        mode === 'append' && current ? [...current, ...result.items] : result.items
      );
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your notifications.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchPage(1, 'replace');
    }, [fetchPage])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPage(1, 'replace');
    setRefreshing(false);
  }, [fetchPage]);

  const onEndReached = useCallback(async () => {
    if (loadingMore || refreshing) return;
    if (pageRef.current >= totalPagesRef.current) return;

    setLoadingMore(true);
    await fetchPage(pageRef.current + 1, 'append');
    setLoadingMore(false);
  }, [fetchPage, loadingMore, refreshing]);

  /**
   * Marks one read and opens it.
   *
   * Optimistic: the row loses its highlight immediately and the server is told
   * after. Nothing depends on the exact moment something was read, and making
   * the tap wait on a round trip before navigating would be the one place the
   * app feels slow.
   */
  const open = useCallback(
    (notification: AppNotification) => {
      if (!notification.readAt) {
        const now = new Date().toISOString();
        setItems(
          (current) =>
            current?.map((row) => (row.id === notification.id ? { ...row, readAt: now } : row)) ??
            null
        );
        setUnread((count) => Math.max(0, count - 1));
        void markNotificationRead(notification.id).catch(() => {
          // The next focus refetches the truth. A failed read is not worth
          // interrupting someone who is already reading the thing.
        });
      }

      if (notification.releaseId) {
        router.push({ pathname: '/release/[id]', params: { id: notification.releaseId } });
      }
    },
    [router]
  );

  const readAll = useCallback(() => {
    const now = new Date().toISOString();
    setItems((current) => current?.map((row) => ({ ...row, readAt: row.readAt ?? now })) ?? null);
    setUnread(0);
    void markAllNotificationsRead().catch(() => {});
  }, []);

  const loading = items === null && error === null;

  return (
    // `className` does not reach `SafeAreaView` — NativeWind's metro resolver
    // re-exports it untouched, so the ground colour goes on a wrapper instead.
    <View className="bg-ink flex-1">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScreenHeader
          title="Notifications"
          subtitle={unread > 0 ? `${unread} unread` : undefined}
          onPress={() => router.back()}
          right={
            unread > 0 ? (
              <Pressable
                onPress={readAll}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Mark all as read">
                <Text className="font-outfit-semibold text-label text-blue-ink">Mark all read</Text>
              </Pressable>
            ) : undefined
          }
        />

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={Brand.blueOnInk} />
          </View>
        ) : (
          <FlatList
            data={items ?? []}
            keyExtractor={(item) => item.id}
            contentContainerClassName="px-4 pb-16 pt-2 gap-2"
            showsVerticalScrollIndicator={false}
            onEndReachedThreshold={0.4}
            onEndReached={() => void onEndReached()}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void onRefresh()}
                tintColor={Brand.muted}
                colors={[Brand.blue]}
                progressBackgroundColor={Brand.inkRaised}
              />
            }
            ListHeaderComponent={
              error ? (
                <View className="pb-2">
                  <AuthAlert messages={[error]} onRetry={() => void fetchPage(1, 'replace')} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              error ? null : (
                <View className="items-center px-6 pt-24">
                  <View className="border-blue-line bg-blue-surface h-[64px] w-[64px] items-center justify-center rounded-full border">
                    <Ionicons name="notifications-outline" size={26} color={Brand.blueOnInk} />
                  </View>
                  <Text className="font-outfit-semibold text-heading text-fg mt-4 text-center">
                    Nothing yet
                  </Text>
                  <Text className="font-outfit-regular text-body text-muted mt-1.5 text-center">
                    When you submit a release, and when we have looked at it, you will hear about it
                    here.
                  </Text>
                </View>
              )
            }
            ListFooterComponent={
              loadingMore ? (
                <View className="py-6">
                  <ActivityIndicator color={Brand.blueOnInk} />
                </View>
              ) : null
            }
            renderItem={({ item }) => {
              const look = LOOK[item.type];
              const unseen = !item.readAt;

              return (
                <Pressable
                  onPress={() => open(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title}. ${item.body}`}
                  className={`rounded-card flex-row gap-3 border p-4 active:opacity-80 ${
                    unseen ? 'border-blue-line bg-blue-surface' : 'border-line-subtle bg-ink-raised'
                  }`}>
                  <View className="mt-0.5">
                    <Ionicons name={look.icon} size={20} color={look.color} />
                  </View>

                  <View className="min-w-0 flex-1">
                    <Text className="font-outfit-semibold text-label text-fg">{item.title}</Text>
                    {/* The reviewer's words, kept as written — a rejection note is
                      the only thing telling the artist what to change. */}
                    <Text className="font-outfit-regular text-body text-muted mt-1">
                      {item.body}
                    </Text>
                    <Text className="font-outfit-regular text-caption text-muted mt-2">
                      {relative(item.createdAt)}
                    </Text>
                  </View>

                  {unseen ? <View className="bg-blue mt-1.5 h-[8px] w-[8px] rounded-full" /> : null}
                </Pressable>
              );
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
