import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthAlert } from '@/components/auth/auth-alert';
import { Artwork } from '@/components/catalogue/artwork';
import { StatusBadge } from '@/components/catalogue/status-badge';
import { ArtworkPlaceholder, EmptyCatalogue } from '@/components/ui/illustrations';
import { ScreenHeader } from '@/components/ui/screen-header';
import { listReleases } from '@/features/catalogue/api';
import type { ReleaseSummary } from '@/features/catalogue/types';
import { getRosterArtist } from '@/features/label/api';
import type { RosterArtist } from '@/features/label/types';
import { ApiError } from '@/lib/api';
import { Brand } from '@/constants/brand';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-[2px]">
      <Text className="font-outfit-medium text-caption text-muted tracking-[0.4px]">{label}</Text>
      <Text className="font-outfit text-body text-fg">{value}</Text>
    </View>
  );
}

/**
 * A roster artist as the label sees them: who they are, and everything
 * released under their name.
 *
 * Tapping a roster row used to open the edit form directly, which answered
 * "change this artist" when the question is almost always "what is going on
 * with this artist". Editing is now one tap further in, where it belongs.
 */
export default function RosterArtistScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [artist, setArtist] = useState<RosterArtist | null>(null);
  const [releases, setReleases] = useState<ReleaseSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      // The catalogue call is scoped server-side to the caller's roster, so a
      // label cannot read another label's artist by guessing this id — it is
      // the same `artistId` filter the Releases screen uses.
      const [loadedArtist, page] = await Promise.all([
        getRosterArtist(id),
        listReleases({ artistId: id, limit: 50 }),
      ]);
      setArtist(loadedArtist);
      setReleases(page.items);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not load this artist.');
    }
  }, [id]);

  // Reloaded on focus so an edit made one screen deeper is reflected on return.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const links = artist
    ? [
        artist.spotifyArtistId ? 'Spotify' : null,
        artist.appleMusicArtistId ? 'Apple Music' : null,
      ].filter(Boolean)
    : [];

  return (
    <View className="bg-ink flex-1" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title={artist?.stageName ?? 'Artist'}
        onPress={() => router.back()}
        icon="chevron-back"
        label="Back"
      />

      {!artist && !error ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Brand.blueOnInk} />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-6 px-4 pb-16"
          showsVerticalScrollIndicator={false}>
          <AuthAlert messages={[error]} onRetry={() => void load()} />

          {artist ? (
            <>
              <Animated.View
                entering={FadeInDown.duration(340)}
                className="items-center gap-3 pt-2">
                <View className="h-24 w-24 overflow-hidden rounded-full">
                  {artist.avatarUrl ? (
                    <Artwork
                      url={artist.avatarUrl}
                      seedChar={artist.stageName.charAt(0)}
                      className="h-24 w-24"
                    />
                  ) : (
                    <ArtworkPlaceholder seedChar={artist.stageName.charAt(0)} />
                  )}
                </View>

                <View className="items-center gap-1">
                  <Text className="font-outfit-bold text-title text-fg text-center">
                    {artist.stageName}
                  </Text>
                  <Text className="font-outfit text-callout text-muted">
                    {releases === null
                      ? '—'
                      : `${releases.length} ${releases.length === 1 ? 'release' : 'releases'}`}
                    {artist.country ? ` · ${artist.country}` : ''}
                  </Text>
                </View>

                <View className="flex-row gap-2 pt-1">
                  <Pressable
                    onPress={() =>
                      router.push({ pathname: '/roster/[id]/edit', params: { id: artist.id } })
                    }
                    accessibilityRole="button"
                    className="bg-ink-raised rounded-button active:bg-ink-high flex-row items-center gap-2 px-4 py-2">
                    <Ionicons name="create-outline" size={16} color={Brand.blueOnInk} />
                    <Text className="font-outfit-semibold text-label text-fg">Edit details</Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      router.push({ pathname: '/new-release', params: { artistId: artist.id } })
                    }
                    accessibilityRole="button"
                    className="bg-blue rounded-button active:bg-blue-pressed flex-row items-center gap-2 px-4 py-2">
                    <Ionicons name="add" size={16} color={Brand.white} />
                    <Text className="font-outfit-semibold text-label text-white">New release</Text>
                  </Pressable>
                </View>
              </Animated.View>

              {artist.legalName || artist.bio || links.length > 0 ? (
                <Animated.View
                  entering={FadeInDown.delay(60).duration(340)}
                  className="bg-ink-raised rounded-card gap-4 p-4">
                  {artist.legalName ? <Field label="LEGAL NAME" value={artist.legalName} /> : null}
                  {links.length > 0 ? (
                    <Field label="STREAMING PROFILES" value={links.join(' · ')} />
                  ) : null}
                  {artist.bio ? <Field label="BIO" value={artist.bio} /> : null}
                </Animated.View>
              ) : null}

              <View className="gap-2">
                <Text className="font-outfit-medium text-caption text-muted tracking-[0.6px]">
                  RELEASES
                </Text>

                {releases && releases.length > 0 ? (
                  releases.map((release) => (
                    <Pressable
                      key={release.id}
                      onPress={() =>
                        router.push({ pathname: '/release/[id]', params: { id: release.id } })
                      }
                      accessibilityRole="button"
                      className="bg-ink-raised active:bg-ink-high rounded-card flex-row items-center gap-3 p-3">
                      <Artwork
                        url={release.artworkUrl}
                        seedChar={release.title.charAt(0)}
                        className="h-[60px] w-[60px]"
                      />
                      <View className="flex-1 gap-1">
                        <Text
                          numberOfLines={1}
                          className="font-outfit-semibold text-body text-fg">
                          {release.title}
                        </Text>
                        <Text className="font-outfit text-caption text-muted">
                          {release.trackCount}{' '}
                          {release.trackCount === 1 ? 'track' : 'tracks'}
                        </Text>
                      </View>
                      <StatusBadge status={release.status} />
                    </Pressable>
                  ))
                ) : releases ? (
                  <View className="items-center gap-3 px-6 py-8">
                    <EmptyCatalogue size={96} />
                    <Text className="font-outfit text-callout text-muted text-center">
                      Nothing released under {artist.stageName} yet.
                    </Text>
                  </View>
                ) : null}
              </View>
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
