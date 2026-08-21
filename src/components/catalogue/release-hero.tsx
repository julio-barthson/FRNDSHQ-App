import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { StatusBadge } from '@/components/catalogue/status-badge';
import { ArtworkPlaceholder, ArtworkScrim, EmptyCatalogue } from '@/components/ui/illustrations';
import { isEditable } from '@/features/catalogue/detail';
import type { ReleaseSummary } from '@/features/catalogue/types';

const TYPE_LABEL: Record<ReleaseSummary['type'], string> = {
  SINGLE: 'Single',
  EP: 'EP',
  ALBUM: 'Album',
};

/**
 * The top of Home, in both of its states.
 *
 * With a release it is the "latest release" card the artist recognises from
 * every music dashboard: artwork edge to edge, a scrim, the status, and one
 * action. With an empty catalogue the same block becomes the empty state, so
 * the space is never wasted and a new account still opens onto something that
 * looks like a music app rather than a form.
 */
export function ReleaseHero({
  release,
  onPress,
}: {
  release: ReleaseSummary | null;
  onPress: () => void;
}) {
  if (!release) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        className="border-violet-line bg-violet-surface rounded-card items-center gap-4 overflow-hidden border p-6">
        <EmptyCatalogue />
        <View className="items-center gap-2">
          <Text className="font-outfit-bold text-title text-fg text-center">
            Let&apos;s get your first release ready
          </Text>
          <Text className="font-outfit text-callout text-muted text-center">
            Add your tracks, artwork and details. We&apos;ll check it over before it goes anywhere.
          </Text>
        </View>
        <View className="bg-violet active:bg-violet-pressed rounded-button min-h-[48px] w-full items-center justify-center px-6 py-3">
          <Text className="font-outfit-bold text-body text-white">Create a release</Text>
        </View>
      </Pressable>
    );
  }

  // A draft is unfinished work to resume; anything else is just there to open.
  const editable = isEditable(release.status);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${release.title}, ${TYPE_LABEL[release.type]}`}
      className="rounded-card overflow-hidden active:opacity-90">
      <View className="h-[260px] w-full">
        {release.artworkUrl ? (
          <Image
            source={{ uri: release.artworkUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <ArtworkPlaceholder seedChar={release.title.charAt(0)} />
        )}

        {/* Absolute so the scrim and copy sit over the art rather than under it. */}
        <View className="absolute inset-0">
          <ArtworkScrim />
        </View>

        <View className="absolute inset-0 justify-between p-4">
          <View className="flex-row">
            <StatusBadge status={release.status} />
          </View>

          <View className="gap-3">
            <View className="gap-1">
              <Text className="font-outfit-bold text-title text-white" numberOfLines={1}>
                {release.title}
              </Text>
              <Text className="font-outfit text-callout text-white/70">
                {TYPE_LABEL[release.type]} · {release.trackCount}{' '}
                {release.trackCount === 1 ? 'track' : 'tracks'}
              </Text>
            </View>

            <View className="bg-violet rounded-button min-h-[44px] items-center justify-center self-start px-5 py-3">
              <Text className="font-outfit-bold text-callout text-white">
                {editable ? 'Finish setup' : 'View release'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
