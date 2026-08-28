import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArtworkPlaceholder, EmptyCatalogue } from '@/components/ui/illustrations';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Brand } from '@/constants/brand';
import { listMySeats } from '@/features/label/api';
import type { ArtistSeat } from '@/features/label/types';
import { ApiError } from '@/lib/api';

/**
 * The artists a label has shared with this account.
 *
 * Worth its own screen rather than a line on Profile: someone holding two or
 * three seats otherwise has no way to see what they can reach, because a seat
 * shows up only as extra rows quietly appearing in their catalogue.
 */
export default function SharedWithMeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [seats, setSeats] = useState<ArtistSeat[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSeats(await listMySeats());
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not load this just now.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <View className="bg-ink flex-1" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        icon="chevron-back"
        label="Back"
        title="Shared with me"
        onPress={() => router.back()}
      />

      {seats === null && !error ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Brand.blueOnInk} />
        </View>
      ) : (
        <FlatList
          data={seats ?? []}
          keyExtractor={(seat) => seat.id}
          contentContainerClassName="gap-3 px-4 pb-8 pt-2"
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/releases', params: { artistId: item.artist.id } })
              }
              accessibilityRole="button"
              accessibilityLabel={`${item.artist.stageName}, ${
                item.role === 'MANAGER' ? 'you can edit' : 'view only'
              }`}
              className="bg-ink-raised active:bg-ink-high rounded-card flex-row items-center gap-3 p-3">
              <View className="h-12 w-12 overflow-hidden rounded-full">
                <ArtworkPlaceholder seedChar={item.artist.stageName.charAt(0)} />
              </View>

              <View className="flex-1 gap-[2px]">
                <Text numberOfLines={1} className="font-outfit-semibold text-body text-fg">
                  {item.artist.stageName}
                </Text>
                <Text className="font-outfit text-caption text-muted">
                  {item.role === 'MANAGER'
                    ? 'You can edit their releases'
                    : 'You can view their releases'}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={Brand.muted} />
            </Pressable>
          )}
          ListEmptyComponent={
            <View className="items-center gap-4 px-8 pt-16">
              {error ? (
                <Text className="font-outfit text-body text-muted text-center">{error}</Text>
              ) : (
                <>
                  <EmptyCatalogue size={110} />
                  <Text className="font-outfit-semibold text-body text-fg text-center">
                    Nothing shared with you
                  </Text>
                  <Text className="font-outfit text-caption text-muted text-center">
                    When a label gives you access to one of their artists, it appears here.
                  </Text>
                </>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}
