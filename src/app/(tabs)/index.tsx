import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthAlert } from '@/components/auth/auth-alert';
import { ReleaseHero } from '@/components/catalogue/release-hero';
import { Artwork } from '@/components/catalogue/artwork';
import { useUnreadCount } from '@/features/notifications/use-unread-count';
import { Brand } from '@/constants/brand';
import { useSession } from '@/features/auth/session';
import { listReleases } from '@/features/catalogue/api';
import { attentionItems, inProgress, summarise } from '@/features/catalogue/dashboard';
import type { ReleaseSummary } from '@/features/catalogue/types';
import { ApiError } from '@/lib/api';

const DASHBOARD_LIMIT = 20;
const IN_PROGRESS_SHOWN = 3;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function SectionHeading({ children }: { children: string }) {
  return <Text className="font-outfit-medium text-caption text-muted">{children}</Text>;
}

/** Icon over a label, side by side — the quick actions off the Distro Hub. */
function ActionTile({
  icon,
  label,
  tint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="bg-ink-raised active:bg-ink-high rounded-card flex-1 items-center gap-2 p-4">
      <View className="bg-ink-high h-[40px] w-[40px] items-center justify-center rounded-full">
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <Text className="font-outfit-medium text-label text-fg">{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useSession();

  const [releases, setReleases] = useState<ReleaseSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const page = await listReleases({ limit: DASHBOARD_LIMIT });
      setReleases(page.items);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Could not load your releases just now.'
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const summary = releases ? summarise(releases) : null;
  const attention = releases ? attentionItems(releases) : [];
  // The list arrives newest first, so the hero is simply the head of it.
  const latest = releases?.[0] ?? null;
  // The hero already carries the newest one, so it is not repeated below.
  const drafts = releases
    ? inProgress(releases)
        .filter((release) => release.id !== latest?.id)
        .slice(0, IN_PROGRESS_SHOWN)
    : [];
  const name = user?.firstName ?? null;
  // Refetched on focus, so coming back from the centre lands on a correct bell.
  const { unread } = useUnreadCount();

  function openRelease(id: string) {
    router.push({ pathname: '/release/[id]', params: { id } });
  }

  return (
    <View className="bg-ink flex-1" style={{ paddingTop: insets.top }}>
      {/* Pinned. The greeting is orientation rather than content, and the
          avatar is a navigation target — neither is worth scrolling away. */}
      <View className="mb-2 flex-row items-center gap-4 px-4 pt-4">
        <View className="flex-1 gap-1">
          <Text className="font-outfit text-callout text-muted">{greeting()}</Text>
          <Text className="font-outfit-bold text-display text-fg" numberOfLines={1}>
            {name ?? 'Welcome'}
          </Text>
        </View>

        {/* The bell sits beside the avatar rather than becoming a fourth tab:
            three destinations was a deliberate call in `(tabs)/_layout`, and
            notifications are something you check, not somewhere you live. */}
        <Pressable
          onPress={() => router.push('/notifications')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={
            unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'
          }>
          <View className="border-line-subtle bg-ink-raised h-[44px] w-[44px] items-center justify-center rounded-full border">
            <Ionicons name="notifications-outline" size={20} color={Brand.blueOnInk} />
          </View>
          {unread > 0 ? (
            <View className="bg-blue absolute -right-0.5 -top-0.5 h-[18px] min-w-[18px] items-center justify-center rounded-full px-1">
              <Text className="font-outfit-bold text-[10px] text-white">
                {unread > 9 ? '9+' : unread}
              </Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          onPress={() => router.push('/profile')}
          accessibilityRole="button"
          accessibilityLabel="Profile">
          {user?.image ? (
            <Image
              source={{ uri: user.image }}
              style={{ width: 44, height: 44, borderRadius: 22 }}
              contentFit="cover"
            />
          ) : (
            <View className="border-blue-line bg-blue-surface h-[44px] w-[44px] items-center justify-center rounded-full border">
              <Text className="font-outfit-bold text-heading text-blue-ink">
                {(name ?? user?.email ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-4 pb-16"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={Brand.muted}
            colors={[Brand.blue]}
            progressBackgroundColor={Brand.inkRaised}
          />
        }>
        <AuthAlert messages={[error]} onRetry={() => void load()} />

        {releases === null && error === null ? (
          <View className="bg-ink-raised rounded-card h-[260px] items-center justify-center">
            <ActivityIndicator color={Brand.blueOnInk} />
          </View>
        ) : (
          <ReleaseHero
            release={latest}
            onPress={() => (latest ? openRelease(latest.id) : router.push('/new-release'))}
          />
        )}

        {summary && summary.total > 0 ? (
          <View className="mt-4 flex-row gap-2">
            <ActionTile
              icon="add-circle"
              label="New release"
              tint={Brand.blueOnInk}
              onPress={() => router.push('/new-release')}
            />
            <ActionTile
              icon="albums"
              label={`${summary.total} ${summary.total === 1 ? 'release' : 'releases'}`}
              tint={Brand.blueOnInk}
              onPress={() => router.push('/releases')}
            />
          </View>
        ) : null}

        {attention.length > 0 ? (
          <View className="mt-4 gap-2">
            <SectionHeading>NEEDS YOUR ATTENTION</SectionHeading>
            {attention.map((item) => (
              <Pressable
                key={`${item.releaseId}-${item.message}`}
                onPress={() => openRelease(item.releaseId)}
                accessibilityRole="button"
                className="bg-ink-raised active:bg-ink-high rounded-card flex-row items-center gap-4 p-4">
                <View className="flex-1 gap-1">
                  <Text className="font-outfit-semibold text-heading text-fg" numberOfLines={1}>
                    {item.releaseTitle}
                  </Text>
                  <Text
                    className={`font-outfit text-callout ${
                      item.tone === 'urgent' ? 'text-danger' : 'text-muted'
                    }`}
                    numberOfLines={1}>
                    {item.message}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Brand.muted} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {drafts.length > 0 ? (
          <View className="mt-4 gap-2">
            <View className="flex-row items-center justify-between">
              <SectionHeading>IN PROGRESS</SectionHeading>
              <Pressable
                onPress={() => router.push('/releases')}
                accessibilityRole="button"
                hitSlop={12}>
                <Text className="font-outfit-semibold text-label text-blue-ink">See all</Text>
              </Pressable>
            </View>

            {drafts.map((release) => (
              <Pressable
                key={release.id}
                onPress={() => openRelease(release.id)}
                accessibilityRole="button"
                className="bg-ink-raised active:bg-ink-high rounded-card flex-row items-center gap-4 p-3">
                <Artwork
                  url={release.artworkUrl}
                  seedChar={release.title.charAt(0)}
                  className="h-[72px] w-[72px]"
                />

                <View className="flex-1 gap-1">
                  <Text className="font-outfit-semibold text-body text-fg" numberOfLines={1}>
                    {release.title}
                  </Text>
                  <Text className="font-outfit text-label text-muted">
                    {release.status === 'REJECTED' ? 'Needs changes' : 'Draft'} ·{' '}
                    {release.trackCount} {release.trackCount === 1 ? 'track' : 'tracks'}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color={Brand.muted} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
