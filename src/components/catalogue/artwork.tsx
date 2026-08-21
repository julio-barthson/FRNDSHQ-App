import { Image } from 'expo-image';
import { View } from 'react-native';

import { ArtworkPlaceholder } from '@/components/ui/illustrations';

/**
 * Cover art, everywhere it appears.
 *
 * The inset hairline is the point: a dark cover on a pure black ground has no
 * edge at all and reads as a hole rather than a record. An 8% white border
 * *inside* the rounded corner gives it one without drawing a box around it.
 */
export function Artwork({
  url,
  seedChar,
  radius = 10,
  className = '',
}: {
  url: string | null;
  seedChar: string;
  radius?: number;
  className?: string;
}) {
  return (
    <View className={`overflow-hidden ${className}`} style={{ borderRadius: radius }}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={180}
        />
      ) : (
        <ArtworkPlaceholder seedChar={seedChar} />
      )}

      <View
        pointerEvents="none"
        className="absolute inset-0 border border-white/10"
        style={{ borderRadius: radius }}
      />
    </View>
  );
}
