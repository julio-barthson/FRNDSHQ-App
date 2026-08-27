import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';

import { ArtworkPlaceholder } from '@/components/ui/illustrations';
import { Brand } from '@/constants/brand';
import { PickerError, pickAvatar } from '@/features/catalogue/pick-image';
import { checkFile, uploadFile } from '@/features/catalogue/upload';
import { ApiError } from '@/lib/api';

/**
 * A roster artist's picture.
 *
 * Unlike {@link ArtworkPicker} this does not attach anything on its own: the
 * add form has no artist to attach it to yet. It uploads, hands the asset id
 * back, and the form sends it with the rest of the fields on save — which also
 * means abandoning the form leaves an orphan asset rather than a half-made
 * artist. `MediaCleanupService` sweeps those, and it deliberately skips
 * AVATAR, so this one is worth watching if roster editing ever gets busy.
 */
export function AvatarPicker({
  avatarUrl,
  seedChar,
  disabled,
  onPicked,
}: {
  /** The saved picture, if there is one. Replaced by the local preview once picked. */
  avatarUrl: string | null;
  seedChar: string;
  disabled?: boolean;
  onPicked: (assetId: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  // Shown straight after picking, so the face appears before the upload ends.
  const [preview, setPreview] = useState<string | null>(null);

  const shown = preview ?? avatarUrl;

  async function onPress() {
    if (busy || disabled) return;

    setError(null);
    try {
      const file = await pickAvatar();
      if (!file) return;

      // Checked before spending the upload; the server re-checks regardless.
      const rejection = checkFile('AVATAR', file);
      if (rejection) {
        setError(rejection);
        return;
      }

      setPreview(file.uri);
      setBusy(true);
      setProgress(0);

      const { assetId } = await uploadFile('AVATAR', file, setProgress);
      onPicked(assetId);
    } catch (caught) {
      // The preview is dropped: leaving a face on screen for an upload that
      // failed would promise a picture the artist is not going to have.
      setPreview(null);
      setError(
        caught instanceof PickerError || caught instanceof ApiError
          ? caught.message
          : 'Could not upload that image. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="items-center gap-2">
      <Pressable
        onPress={() => void onPress()}
        disabled={busy || disabled}
        accessibilityRole="button"
        accessibilityLabel={shown ? "Change artist's picture" : "Add artist's picture"}
        className="active:opacity-90">
        <View className="h-[104px] w-[104px]">
          <View className="h-full w-full overflow-hidden rounded-full">
            {shown ? (
              <Image source={{ uri: shown }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <ArtworkPlaceholder seedChar={seedChar} />
            )}
          </View>

          {busy ? (
            <View className="absolute inset-0 items-center justify-center rounded-full bg-black/65">
              <ActivityIndicator color={Brand.white} />
              <Text className="font-outfit-medium text-caption mt-1 text-white">
                {Math.round(progress * 100)}%
              </Text>
            </View>
          ) : null}

          {/* The badge is the affordance — without it a round picture reads as
              decoration rather than something you can replace. */}
          <View className="bg-blue absolute right-0 bottom-0 h-[32px] w-[32px] items-center justify-center rounded-full">
            <Ionicons name="camera" size={16} color={Brand.white} />
          </View>
        </View>
      </Pressable>

      {error ? (
        <Text className="font-outfit text-caption text-danger px-6 text-center">{error}</Text>
      ) : null}
    </View>
  );
}
