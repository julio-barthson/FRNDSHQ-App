import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Artwork } from '@/components/catalogue/artwork';
import { Brand } from '@/constants/brand';
import { setReleaseArtwork } from '@/features/catalogue/api';
import { PickerError, pickArtwork } from '@/features/catalogue/pick-image';
import { checkFile, uploadFile } from '@/features/catalogue/upload';
import { ApiError } from '@/lib/api';

/**
 * Cover art, at the top of the edit form.
 *
 * It sits here rather than buried in a field list because it is the most
 * visible thing about a release and the first item the submission checklist
 * blocks on. Cropping is forced square by the picker — DSPs require it, and
 * refusing early is kinder than rejecting the upload afterwards.
 */
export function ArtworkPicker({
  releaseId,
  artworkUrl,
  seedChar,
  onChanged,
}: {
  releaseId: string;
  artworkUrl: string | null;
  seedChar: string;
  /** Fires once the asset is attached, so the parent can reload the release. */
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  async function onPick() {
    if (busy) return;

    setError(null);
    try {
      const file = await pickArtwork();
      if (!file) return;

      // Fails fast on type and size rather than spending the upload to find
      // out — the server re-checks all of it regardless.
      const rejection = checkFile('ARTWORK', file);
      if (rejection) {
        setError(rejection);
        return;
      }

      setBusy(true);
      setProgress(0);
      const { assetId } = await uploadFile('ARTWORK', file, setProgress);
      await setReleaseArtwork(releaseId, assetId);
      onChanged();
    } catch (caught) {
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
    <View className="items-center gap-3">
      <Pressable
        onPress={() => void onPick()}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={artworkUrl ? 'Change cover artwork' : 'Add cover artwork'}
        className="active:opacity-90">
        <View className="h-[180px] w-[180px]">
          <Artwork url={artworkUrl} seedChar={seedChar} radius={16} className="h-full w-full" />

          {busy ? (
            <View className="absolute inset-0 items-center justify-center rounded-[16px] bg-black/65">
              <ActivityIndicator color={Brand.white} />
              <Text className="font-outfit-medium text-label mt-2 text-white">
                {Math.round(progress * 100)}%
              </Text>
            </View>
          ) : null}

          {/* The badge is the affordance — without it a cover reads as a
              picture rather than something you can replace. */}
          <View className="bg-blue absolute right-2 bottom-2 h-[36px] w-[36px] items-center justify-center rounded-full">
            <Ionicons name={artworkUrl ? 'pencil' : 'camera'} size={18} color={Brand.white} />
          </View>
        </View>
      </Pressable>

      {error ? (
        <Text className="font-outfit text-label text-danger text-center">{error}</Text>
      ) : (
        <Text className="font-outfit text-label text-muted text-center">
          Square, JPG or PNG, up to 10MB.
        </Text>
      )}
    </View>
  );
}
