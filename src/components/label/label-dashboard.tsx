import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { AuthAlert } from '@/components/auth/auth-alert';
import { Artwork } from '@/components/catalogue/artwork';
import { ArtworkPlaceholder, EmptyCatalogue } from '@/components/ui/illustrations';
import { Brand } from '@/constants/brand';
import { attentionItems } from '@/features/catalogue/dashboard';
import type { LabelOverview, OverviewArtist } from '@/features/label/types';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text className="font-outfit-medium text-caption text-muted tracking-[0.6px]">{children}</Text>
  );
}

/**
 * One stage of the pipeline.
 *
 * The count is the headline and the label is the caption, not the other way
 * round: the number is what is being scanned for.
 */
function StageTile({
  count,
  label,
  tone,
  onPress,
}: {
  count: number;
  label: string;
  tone: 'plain' | 'urgent';
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${count} ${label}`}
      className="bg-ink-raised active:bg-ink-high rounded-card flex-1 gap-1 p-3">
      <Text
        className={`font-outfit-bold text-title ${
          tone === 'urgent' && count > 0 ? 'text-danger' : 'text-fg'
        }`}>
        {count}
      </Text>
      <Text numberOfLines={2} className="font-outfit text-caption text-muted">
        {label}
      </Text>
    </Pressable>
  );
}

function RosterChip({ artist, onPress }: { artist: OverviewArtist; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${artist.stageName}, ${artist.releaseCount} releases`}
      className="w-[92px] items-center gap-2 active:opacity-70">
      <View className="h-16 w-16 overflow-hidden rounded-full">
        {artist.avatarUrl ? (
          <Artwork url={artist.avatarUrl} seedChar={artist.stageName.charAt(0)} className="h-16 w-16" />
        ) : (
          <ArtworkPlaceholder seedChar={artist.stageName.charAt(0)} />
        )}
      </View>
      <View className="items-center">
        <Text numberOfLines={1} className="font-outfit-semibold text-label text-fg text-center">
          {artist.stageName}
        </Text>
        <Text className="font-outfit text-caption text-muted">{artist.releaseCount}</Text>
      </View>
    </Pressable>
  );
}

/**
 * The label dashboard.
 *
 * Deliberately not the artist's Home with different words. An artist opens the
 * app to their own latest release, so that screen leads with one hero. A label
 * opens it asking "what needs me, and whose is it" — so this leads with the
 * pipeline, attributes every row to an artist, and never shows a hero, because
 * the newest of a dozen releases across five artists is an arbitrary pick.
 *
 * Nothing here reports streams or revenue: Phase 1 delivers nowhere, and a
 * dashboard that implies otherwise is a lie with a number on it.
 */
export function LabelDashboard({
  overview,
  error,
  onRetry,
}: {
  overview: LabelOverview | null;
  error: string | null;
  onRetry: () => void;
}) {
  const router = useRouter();

  if (!overview) {
    return (
      <ScrollView contentContainerClassName="gap-6 px-4 pb-16">
        <AuthAlert messages={[error]} onRetry={onRetry} />
        {!error ? (
          <View className="bg-ink-raised rounded-card h-[200px] items-center justify-center">
            <ActivityIndicator color={Brand.blueOnInk} />
          </View>
        ) : null}
      </ScrollView>
    );
  }

  const { pipeline, roster, actionable } = overview;
  const attention = attentionItems(actionable);
  const unlinked = roster.filter((artist) => !artist.hasSpotify).length;

  const openStatus = (status: string) =>
    router.push({ pathname: '/releases', params: { status } });

  return (
    <>
      <AuthAlert messages={[error]} onRetry={onRetry} />

      {/* An empty roster is the one state where nothing else on this screen can
          say anything useful, so it takes the whole page rather than sitting
          under four zeroes. */}
      {roster.length === 0 ? (
        <View className="items-center gap-4 px-6 pt-10">
          <EmptyCatalogue size={124} />
          <Text className="font-outfit-semibold text-heading text-fg text-center">
            Sign your first artist
          </Text>
          <Text className="font-outfit text-callout text-muted text-center">
            Every release is credited to an artist on your roster. Add one and you can start a
            release straight away.
          </Text>
          <Pressable
            onPress={() => router.push('/roster/new')}
            accessibilityRole="button"
            className="bg-blue rounded-button active:bg-blue-pressed mt-2 px-5 py-3">
            <Text className="font-outfit-bold text-body text-white">Add an artist</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View className="gap-2">
            <SectionHeading>CATALOGUE</SectionHeading>
            <View className="flex-row gap-2">
              <StageTile
                count={pipeline.drafts}
                label="In progress"
                tone="plain"
                onPress={() => openStatus('DRAFT')}
              />
              <StageTile
                count={pipeline.awaitingReview}
                label="Awaiting review"
                tone="plain"
                onPress={() => openStatus('SUBMITTED')}
              />
              <StageTile
                count={pipeline.needsChanges}
                label="Needs changes"
                tone="urgent"
                onPress={() => openStatus('REJECTED')}
              />
              <StageTile
                count={pipeline.ready}
                label="Ready"
                tone="plain"
                onPress={() => openStatus('READY')}
              />
            </View>
          </View>

          <View className="flex-row gap-2">
            <Pressable
              onPress={() => router.push('/new-release')}
              accessibilityRole="button"
              className="bg-blue rounded-card active:bg-blue-pressed flex-1 flex-row items-center justify-center gap-2 py-3">
              <Ionicons name="add-circle" size={18} color={Brand.white} />
              <Text className="font-outfit-semibold text-label text-white">New release</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/roster')}
              accessibilityRole="button"
              className="bg-ink-raised rounded-card active:bg-ink-high flex-1 flex-row items-center justify-center gap-2 py-3">
              <Ionicons name="people" size={18} color={Brand.blueOnInk} />
              <Text className="font-outfit-semibold text-label text-fg">
                {roster.length} {roster.length === 1 ? 'artist' : 'artists'}
              </Text>
            </Pressable>
          </View>

          {attention.length > 0 ? (
            <View className="gap-2">
              <SectionHeading>NEEDS YOUR ATTENTION</SectionHeading>
              {attention.map((item) => (
                <Pressable
                  key={`${item.releaseId}-${item.message}`}
                  onPress={() => router.push({ pathname: '/release/[id]', params: { id: item.releaseId } })}
                  accessibilityRole="button"
                  className="bg-ink-raised active:bg-ink-high rounded-card flex-row items-center gap-4 p-4">
                  <View className="flex-1 gap-1">
                    {/* The artist leads. On a label's screen the title alone
                        does not say whose problem this is. */}
                    <Text className="font-outfit-medium text-caption text-blue-ink" numberOfLines={1}>
                      {item.artistName || 'Unattributed'}
                    </Text>
                    <Text className="font-outfit-semibold text-body text-fg" numberOfLines={1}>
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

          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <SectionHeading>ROSTER</SectionHeading>
              <Pressable onPress={() => router.push('/roster')} accessibilityRole="button" hitSlop={12}>
                <Text className="font-outfit-semibold text-label text-blue-ink">Manage</Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-1 pr-4">
              {roster.map((artist) => (
                <RosterChip
                  key={artist.id}
                  artist={artist}
                  onPress={() => router.push({ pathname: '/roster/[id]', params: { id: artist.id } })}
                />
              ))}
            </ScrollView>

            {/* A nudge, not a warning: an unlinked artist is perfectly fine
                until there is somewhere to deliver to, which is Phase 3. */}
            {unlinked > 0 ? (
              <Text className="font-outfit text-caption text-muted">
                {unlinked} {unlinked === 1 ? 'artist has' : 'artists have'} no streaming profile
                linked yet.
              </Text>
            ) : null}
          </View>
        </>
      )}
    </>
  );
}
