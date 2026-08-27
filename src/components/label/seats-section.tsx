import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';

import { Brand } from '@/constants/brand';
import { inviteSeat, listSeats, revokeSeat } from '@/features/label/api';
import type { ArtistSeat, SeatRole } from '@/features/label/types';
import { ApiError } from '@/lib/api';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function roleLabel(role: SeatRole): string {
  return role === 'MANAGER' ? 'Can edit releases' : 'Can view only';
}

function SeatRow({ seat, onRevoke }: { seat: ArtistSeat; onRevoke: () => void }) {
  const pending = seat.status === 'PENDING';

  return (
    <View className="flex-row items-center gap-3 py-2">
      <View className="flex-1 gap-[2px]">
        <Text numberOfLines={1} className="font-outfit-medium text-callout text-fg">
          {seat.email}
        </Text>
        <Text className="font-outfit text-caption text-muted">
          {roleLabel(seat.role)}
          {pending ? ' · Invitation sent' : ''}
        </Text>
      </View>

      <Pressable
        onPress={onRevoke}
        accessibilityRole="button"
        accessibilityLabel={`Remove access for ${seat.email}`}
        hitSlop={10}
        className="active:opacity-60">
        <Ionicons name="close-circle-outline" size={20} color={Brand.muted} />
      </Pressable>
    </View>
  );
}

/**
 * Who else can reach this artist.
 *
 * A seat is access, not ownership: the label keeps the catalogue, and removing
 * someone takes nothing away from it. The copy says so plainly, because
 * "remove artist" and "remove someone's access to an artist" are one careless
 * sentence apart and only one of them is reversible.
 */
export function SeatsSection({ artistId, artistName }: { artistId: string; artistName: string }) {
  const [seats, setSeats] = useState<ArtistSeat[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<SeatRole>('VIEWER');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setSeats(await listSeats(artistId));
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not load access.');
    }
  }, [artistId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onInvite() {
    if (busy) return;

    const address = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(address)) {
      setError('Enter a valid email address.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await inviteSeat(artistId, address, role);
      setEmail('');
      setAdding(false);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not send that invitation.');
    } finally {
      setBusy(false);
    }
  }

  function onRevoke(seat: ArtistSeat) {
    Alert.alert(
      `Remove ${seat.email}?`,
      `They will lose access to ${artistName}. Nothing in the catalogue changes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await revokeSeat(seat.id);
                await load();
              } catch (caught) {
                setError(
                  caught instanceof ApiError ? caught.message : 'Could not remove that access.'
                );
              }
            })();
          },
        },
      ]
    );
  }

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="font-outfit-medium text-caption text-muted tracking-[0.6px]">ACCESS</Text>
        {!adding ? (
          <Pressable onPress={() => setAdding(true)} accessibilityRole="button" hitSlop={12}>
            <Text className="font-outfit-semibold text-label text-blue-ink">Invite</Text>
          </Pressable>
        ) : null}
      </View>

      <View className="bg-ink-raised rounded-card gap-2 p-4">
        {seats === null && !error ? (
          <ActivityIndicator color={Brand.muted} />
        ) : seats && seats.length > 0 ? (
          seats.map((seat) => (
            <SeatRow key={seat.id} seat={seat} onRevoke={() => onRevoke(seat)} />
          ))
        ) : !adding ? (
          <Text className="font-outfit text-callout text-muted">
            Only you can see {artistName}. Invite them, or their manager, to give them their own
            login.
          </Text>
        ) : null}

        {adding ? (
          <View className="gap-3 pt-1">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="their@email.com"
              placeholderTextColor={Brand.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!busy}
              className="border-line-subtle rounded-button font-outfit text-body text-fg border px-3 py-3"
            />

            <View className="flex-row gap-2">
              {(['VIEWER', 'MANAGER'] as const).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setRole(option)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: role === option }}
                  className={`rounded-button flex-1 items-center py-2 ${
                    role === option ? 'bg-blue' : 'bg-ink-high'
                  }`}>
                  <Text
                    className={`font-outfit-semibold text-label ${
                      role === option ? 'text-white' : 'text-muted'
                    }`}>
                    {option === 'VIEWER' ? 'View only' : 'Can edit'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="flex-row gap-2">
              <Pressable
                onPress={() => {
                  setAdding(false);
                  setEmail('');
                  setError(null);
                }}
                accessibilityRole="button"
                className="rounded-button flex-1 items-center py-3">
                <Text className="font-outfit-semibold text-label text-muted">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void onInvite()}
                disabled={busy}
                accessibilityRole="button"
                className={`bg-blue rounded-button flex-1 items-center py-3 ${busy ? 'opacity-40' : 'active:bg-blue-pressed'}`}>
                {busy ? (
                  <ActivityIndicator color={Brand.white} />
                ) : (
                  <Text className="font-outfit-semibold text-label text-white">Send invite</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : null}

        {error ? <Text className="font-outfit text-caption text-danger">{error}</Text> : null}
      </View>
    </View>
  );
}
