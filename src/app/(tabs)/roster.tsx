import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArtworkPlaceholder, EmptyCatalogue } from '@/components/ui/illustrations';
import { Brand } from '@/constants/brand';
import { useSession } from '@/features/auth/session';
import { listRoster } from '@/features/label/api';
import type { RosterArtistSummary } from '@/features/label/types';
import { ApiError } from '@/lib/api';

function ArtistRow({
  artist,
  onPress,
}: {
  artist: RosterArtistSummary;
  onPress: () => void;
}) {
  const releases =
    artist.releaseCount === 1 ? '1 release' : `${artist.releaseCount} releases`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${artist.stageName}, ${releases}`}
      className="bg-ink-raised rounded-card flex-row items-center gap-3 p-3 active:opacity-70">
      <View className="h-12 w-12 overflow-hidden rounded-full">
        <ArtworkPlaceholder seedChar={artist.stageName.charAt(0)} />
      </View>

      <View className="flex-1 gap-[2px]">
        <Text numberOfLines={1} className="font-outfit-semibold text-body text-fg">
          {artist.stageName}
        </Text>
        <Text numberOfLines={1} className="font-outfit text-caption text-muted">
          {releases}
          {artist.country ? ` · ${artist.country}` : ''}
          {artist.spotifyArtistId ? ' · Spotify linked' : ''}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={Brand.muted} />
    </Pressable>
  );
}

/**
 * The label's roster.
 *
 * Hidden from artist accounts by `href: null` in the tab layout rather than by
 * a redirect: the route still exists, so a stray link does not crash, but the
 * bar never offers it to an account with no roster.
 */
export default function RosterScreen() {
  const router = useRouter();
  const { user } = useSession();

  const [artists, setArtists] = useState<RosterArtistSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setArtists(await listRoster());
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not load your roster.');
    }
  }, []);

  // Reloaded on focus rather than once on mount: adding or editing an artist
  // returns here, and a stale list would omit what was just created.
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

  return (
    <SafeAreaView className="bg-ink flex-1" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
        <View className="gap-1">
          <Text className="font-outfit-bold text-title text-fg">Roster</Text>
          <Text className="font-outfit text-caption text-muted">
            {user?.label?.name ?? 'Your label'}
          </Text>
        </View>

        <Pressable
          onPress={() => router.push('/roster/new')}
          accessibilityRole="button"
          accessibilityLabel="Add artist"
          className="bg-blue rounded-full p-2 active:opacity-70">
          <Ionicons name="add" size={22} color={Brand.white} />
        </Pressable>
      </View>

      {artists === null && !error ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Brand.blue} />
        </View>
      ) : (
        <FlatList
          data={artists ?? []}
          keyExtractor={(artist) => artist.id}
          contentContainerClassName="gap-3 px-4 pb-8"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={Brand.muted}
            />
          }
          renderItem={({ item }) => (
            <ArtistRow artist={item} onPress={() => router.push(`/roster/${item.id}`)} />
          )}
          ListEmptyComponent={
            <View className="items-center gap-4 px-8 pt-16">
              {error ? (
                <Text className="font-outfit text-body text-muted text-center">{error}</Text>
              ) : (
                <>
                  <EmptyCatalogue size={124} />
                  <Text className="font-outfit-semibold text-body text-fg text-center">
                    No artists yet
                  </Text>
                  <Text className="font-outfit text-caption text-muted text-center">
                    Add the artists your label releases under. A release is always credited to one
                    of them.
                  </Text>
                </>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
