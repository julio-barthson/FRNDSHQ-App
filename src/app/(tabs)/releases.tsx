import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthAlert } from '@/components/auth/auth-alert';
import { Artwork } from '@/components/catalogue/artwork';
import { STATUS_EXPLAINER, StatusBadge } from '@/components/catalogue/status-badge';
import { EmptyCatalogue, EmptySearch } from '@/components/ui/illustrations';
import { Brand } from '@/constants/brand';
import { useSession } from '@/features/auth/session';
import { listReleases } from '@/features/catalogue/api';
import { totalRuntime } from '@/features/catalogue/detail';
import type { ReleaseStatus, ReleaseSummary } from '@/features/catalogue/types';
import { ApiError } from '@/lib/api';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
/** Past this the stagger stops compounding, so row 40 does not wait two seconds. */
const MAX_STAGGER = 8;

type ViewMode = 'grid' | 'list';

/**
 * Only the statuses Phase 1 can actually produce.
 *
 * The enum carries eight, but nothing sets `DELIVERING`, `LIVE` or
 * `TAKEN_DOWN` — distribution is a later phase — and `READY` needs an admin
 * review that does not exist yet. Offering those as filters would advertise
 * features the app does not have and return an empty list every time.
 */
const FILTERS: { label: string; value: ReleaseStatus | null }[] = [
  { label: 'All', value: null },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Needs changes', value: 'REJECTED' },
];

const TYPE_LABEL: Record<ReleaseSummary['type'], string> = {
  SINGLE: 'Single',
  EP: 'EP',
  ALBUM: 'Album',
};

function metaLine(release: ReleaseSummary): string {
  const runtime = totalRuntime(release.tracks);
  const tracks = `${release.trackCount} ${release.trackCount === 1 ? 'track' : 'tracks'}`;
  return [TYPE_LABEL[release.type], tracks, runtime].filter(Boolean).join(' · ');
}

/**
 * Every release in this list belongs to the artist looking at it, so their own
 * name on every row would be noise. It earns its place only when the release is
 * by more than them — which is exactly the case worth spotting at a glance.
 */
function collaboratorLine(release: ReleaseSummary, self: string | null): string | null {
  const artist = release.displayArtist;
  if (!artist || (self && artist === self)) return null;
  return artist;
}

/** A slow pulse, so loading reads as pending rather than broken. */
function Shimmer({ className }: { className: string }) {
  const progress = useSharedValue(0.35);

  useEffect(() => {
    progress.value = withRepeat(withTiming(0.85, { duration: 850 }), -1, true);
  }, [progress]);

  const style = useAnimatedStyle(() => ({ opacity: progress.value }));

  return <Animated.View style={style} className={`bg-ink-high ${className}`} />;
}

function SkeletonRow() {
  return (
    <View className="bg-ink-raised rounded-card flex-row items-center gap-4 p-3">
      <Shimmer className="h-[72px] w-[72px] rounded-[10px]" />
      <View className="flex-1 gap-2">
        <Shimmer className="h-[14px] w-2/3 rounded-full" />
        <Shimmer className="h-[11px] w-1/3 rounded-full" />
      </View>
    </View>
  );
}

function SkeletonCard() {
  return (
    <View className="flex-1 gap-2">
      <Shimmer className="aspect-square w-full rounded-[12px]" />
      <Shimmer className="h-[13px] w-3/4 rounded-full" />
      <Shimmer className="h-[10px] w-1/2 rounded-full" />
    </View>
  );
}

function ReleaseRow({
  release,
  index,
  self,
  onPress,
}: {
  release: ReleaseSummary;
  index: number;
  self: string | null;
  onPress: () => void;
}) {
  const explainer = STATUS_EXPLAINER[release.status];
  const collaborators = collaboratorLine(release, self);

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, MAX_STAGGER) * 50).duration(320)}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        className="bg-ink-raised active:bg-ink-high rounded-card flex-row items-center gap-4 p-3">
        <Artwork
          url={release.artworkUrl}
          seedChar={release.title.charAt(0)}
          className="h-[72px] w-[72px]"
        />

        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-outfit-semibold text-body text-fg flex-1" numberOfLines={1}>
              {release.title}
            </Text>
            <StatusBadge status={release.status} />
          </View>

          {collaborators ? (
            <Text className="font-outfit-medium text-label text-blue-ink" numberOfLines={1}>
              {collaborators}
            </Text>
          ) : null}

          <Text className="font-outfit text-label text-muted">{metaLine(release)}</Text>

          {explainer ? (
            <Text className="font-outfit text-label text-muted" numberOfLines={1}>
              {explainer}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function ReleaseCard({
  release,
  index,
  self,
  onPress,
}: {
  release: ReleaseSummary;
  index: number;
  self: string | null;
  onPress: () => void;
}) {
  const collaborators = collaboratorLine(release, self);

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, MAX_STAGGER) * 50).duration(320)}
      className="flex-1">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${release.title}, ${TYPE_LABEL[release.type]}`}
        className="gap-2 active:opacity-80">
        <View>
          <Artwork
            url={release.artworkUrl}
            seedChar={release.title.charAt(0)}
            radius={12}
            className="aspect-square w-full"
          />
          {/* Over the art rather than under the title — the grid has no room
              for a badge on its own line without halving the cover. */}
          <View className="absolute top-2 left-2">
            <StatusBadge status={release.status} />
          </View>
        </View>

        <View className="gap-1">
          <Text className="font-outfit-semibold text-callout text-fg" numberOfLines={1}>
            {release.title}
          </Text>
          <Text className="font-outfit text-label text-muted" numberOfLines={1}>
            {collaborators ?? metaLine(release)}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function ReleasesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useSession();
  const self = user?.artist?.stageName ?? null;

  const [releases, setReleases] = useState<ReleaseSummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mode, setMode] = useState<ViewMode>('grid');

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<ReleaseStatus | null>(null);

  const pageRef = useRef(1);
  const totalPagesRef = useRef(1);

  // One request per pause in typing rather than one per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPage = useCallback(
    async (page: number, kind: 'replace' | 'append') => {
      try {
        const result = await listReleases({
          page,
          limit: PAGE_SIZE,
          ...(debounced.trim() ? { search: debounced.trim() } : {}),
          ...(status ? { status } : {}),
        });

        pageRef.current = result.page;
        totalPagesRef.current = result.totalPages;
        setTotal(result.total);
        setReleases((prev) =>
          kind === 'append' && prev ? [...prev, ...result.items] : result.items
        );
        setError(null);
      } catch (caught) {
        setError(
          caught instanceof ApiError ? caught.message : 'Could not load your releases just now.'
        );
      }
    },
    [debounced, status]
  );

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

  const filtered = Boolean(debounced.trim() || status);
  const loading = releases === null && error === null;

  function clearFilters() {
    setSearch('');
    setDebounced('');
    setStatus(null);
  }

  function openRelease(id: string) {
    router.push({ pathname: '/release/[id]', params: { id } });
  }

  // `total` is the count for the active query, which is exactly what the line
  // under the title should report — a client-side tally would only ever know
  // about the pages already fetched.
  const countLine = loading
    ? ''
    : filtered
      ? `${total} ${total === 1 ? 'result' : 'results'}`
      : `${total} ${total === 1 ? 'release' : 'releases'}`;

  return (
    <View className="bg-ink flex-1" style={{ paddingTop: insets.top }}>
      {/* Search and the chips stay outside the FlatList on purpose: a TextInput
          inside `ListHeaderComponent` is remounted on every list re-render and
          loses focus after a single keystroke. */}
      <View className="gap-4 px-4 pt-4 pb-4">
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="font-outfit-bold text-display text-fg">Releases</Text>
            {countLine ? (
              <Text className="font-outfit text-label text-muted">{countLine}</Text>
            ) : null}
          </View>

          <View className="bg-ink-high flex-row items-center rounded-full p-1">
            {(['grid', 'list'] as ViewMode[]).map((option) => (
              <Pressable
                key={option}
                onPress={() => setMode(option)}
                accessibilityRole="button"
                accessibilityLabel={`${option} view`}
                accessibilityState={{ selected: mode === option }}
                className={`h-[32px] w-[36px] items-center justify-center rounded-full ${
                  mode === option ? 'bg-blue' : ''
                }`}>
                <Ionicons
                  name={option === 'grid' ? 'grid' : 'list'}
                  size={16}
                  color={mode === option ? Brand.white : Brand.muted}
                />
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={() => router.push('/new-release')}
            accessibilityRole="button"
            accessibilityLabel="Create a release"
            hitSlop={12}
            className="bg-blue active:bg-blue-pressed h-[40px] w-[40px] items-center justify-center rounded-full">
            <Ionicons name="add" size={24} color={Brand.white} />
          </Pressable>
        </View>

        <View className="rounded-field border-line bg-ink-field flex-row items-center gap-2 border px-4">
          <Ionicons name="search" size={18} color={Brand.muted} />
          <TextInput
            className="font-outfit text-body text-fg flex-1 py-[12px]"
            value={search}
            onChangeText={setSearch}
            placeholder="Search releases and tracks"
            placeholderTextColor={Brand.muted}
            selectionColor={Brand.blue}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search releases and tracks"
          />
          {search ? (
            <Pressable
              onPress={() => setSearch('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={12}>
              <Ionicons name="close-circle" size={18} color={Brand.muted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 pr-4">
          {FILTERS.map((filter) => {
            const selected = status === filter.value;
            return (
              <Pressable
                key={filter.label}
                onPress={() => setStatus(filter.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className={`rounded-full border px-4 py-2 ${
                  selected
                    ? 'border-blue bg-blue'
                    : 'border-line bg-ink-raised active:bg-ink-high'
                }`}>
                <Text
                  className={`font-outfit-medium text-label ${
                    selected ? 'text-white' : 'text-muted'
                  }`}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {error ? (
        <View className="px-4 pb-4">
          <AuthAlert messages={[error]} onRetry={() => void fetchPage(1, 'replace')} />
        </View>
      ) : null}

      {loading ? (
        mode === 'grid' ? (
          <View className="gap-3 px-4">
            <View className="flex-row gap-3">
              <SkeletonCard />
              <SkeletonCard />
            </View>
            <View className="flex-row gap-3">
              <SkeletonCard />
              <SkeletonCard />
            </View>
          </View>
        ) : (
          <View className="gap-2 px-4">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        )
      ) : (
        <FlatList
          // React Native tears the list down when `numColumns` changes, so the
          // key has to change with the mode or it throws.
          key={mode}
          data={releases ?? []}
          numColumns={mode === 'grid' ? 2 : 1}
          columnWrapperStyle={mode === 'grid' ? { gap: 12 } : undefined}
          keyExtractor={(release) => release.id}
          contentContainerClassName={mode === 'grid' ? 'gap-3 px-4 pb-16' : 'gap-2 px-4 pb-16'}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.4}
          onEndReached={() => void onEndReached()}
          renderItem={({ item, index }) =>
            mode === 'grid' ? (
              <ReleaseCard
                release={item}
                index={index}
                self={self}
                onPress={() => openRelease(item.id)}
              />
            ) : (
              <ReleaseRow
                release={item}
                index={index}
                self={self}
                onPress={() => openRelease(item.id)}
              />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={Brand.muted}
              colors={[Brand.blue]}
              progressBackgroundColor={Brand.inkRaised}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <View className="py-6">
                <ActivityIndicator color={Brand.blueOnInk} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            // Two different situations. Offering "Create a release" under a
            // failed search answers a question nobody asked.
            <View className="bg-ink-raised rounded-card mt-2 items-center gap-2 p-6">
              {filtered ? <EmptySearch /> : <EmptyCatalogue size={124} />}
              <Text className="font-outfit-semibold text-heading text-fg text-center">
                {filtered ? 'Nothing matches' : 'No releases yet'}
              </Text>
              <Text className="font-outfit text-body text-muted text-center">
                {filtered
                  ? 'Try a different search, or clear the filters to see everything.'
                  : "Create your first release and it'll show up here."}
              </Text>

              <Pressable
                onPress={filtered ? clearFilters : () => router.push('/new-release')}
                accessibilityRole="button"
                className="bg-blue active:bg-blue-pressed rounded-button mt-2 min-h-[52px] w-full items-center justify-center py-4">
                <Text className="font-outfit-bold text-body text-white">
                  {filtered ? 'Clear filters' : 'Create a release'}
                </Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}
