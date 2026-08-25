import { Image } from 'expo-image';
import { View } from 'react-native';

// The same white mark the native splash draws and the welcome screen opens on.
const MARK = require('../../../assets/images/splash-icon.png');

/**
 * The mark, above the heading, on every screen outside the app proper.
 *
 * Sign-in, sign-up, the password screens, verification and onboarding are all
 * reached before there is any chrome to say whose app this is — no tab bar, no
 * avatar, nothing but a form. Someone arriving from a verification email lands
 * on a code field with the product's name nowhere on it. The mark is the
 * cheapest way to answer that, and it carries the splash's identity through the
 * whole of the way in rather than dropping it at the first form.
 *
 * Left-aligned by default because the headings it sits above are, and a centred
 * mark over a left-aligned title reads as two different layouts stacked.
 */
export function BrandMark({
  size = 48,
  align = 'left',
}: {
  size?: number;
  align?: 'left' | 'center';
}) {
  return (
    <View className={align === 'center' ? 'items-center' : 'items-start'}>
      <Image
        source={MARK}
        style={{ width: size, height: size }}
        contentFit="contain"
        // Decorative: the heading directly beneath it already names the screen,
        // so a screen reader announcing "FRNDSHQ logo" first is noise.
        accessible={false}
      />
    </View>
  );
}
