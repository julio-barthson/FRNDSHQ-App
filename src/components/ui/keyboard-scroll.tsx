import { forwardRef, useEffect, useState } from 'react';
import { Keyboard, Platform, ScrollView, View, type ScrollViewProps } from 'react-native';

/**
 * How much of the screen the software keyboard is currently covering.
 *
 * `will*` carries the height a frame before the keyboard animates in, which is
 * what keeps the padding in step with it on iOS. Android never emits those
 * events, so it takes `did*` and lands a frame later — unavoidable, and not
 * visible in practice.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (event) => setHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}

export type KeyboardScrollProps = ScrollViewProps & {
  /**
   * Padding below the content with the keyboard down — clearance for a pinned
   * footer, usually. The keyboard's height is added to it, never swapped for
   * it, so the last field still clears the footer while typing.
   */
  bottomInset?: number;
};

/**
 * The scroll view every form on this app uses.
 *
 * `KeyboardAvoidingView` was doing nothing on Android — `behavior` was left
 * `undefined` there, which makes it an ordinary `View`, and the Android window
 * does not resize under edge-to-edge either. So a field below the fold could
 * not be reached once the keyboard was up: the content had nowhere to scroll
 * to.
 *
 * Growing the content instead of shrinking the frame fixes both platforms with
 * one mechanism. Everything the keyboard covers becomes scrollable, rather than
 * the view guessing which field to lift.
 *
 * The growing is done with a spacer at the end of the content, and that detail
 * is not cosmetic. `contentContainerClassName` is compiled by react-native-css
 * into `contentContainerStyle`, and its merge only knows how to combine an
 * inline value with a computed one for the `style` target — every other target,
 * this one included, is a plain overwrite. Setting `contentContainerStyle` here
 * silently threw away the caller's whole class list: `grow`, `justify-center`
 * and `px-6` went with it, which left the auth screens pinned to the top of the
 * page with no side padding. A child cannot collide with a style prop.
 */
export const KeyboardScroll = forwardRef<ScrollView, KeyboardScrollProps>(function KeyboardScroll(
  { bottomInset = 0, children, ...rest },
  ref
) {
  const keyboard = useKeyboardHeight();
  const spacer = bottomInset + keyboard;

  return (
    <ScrollView
      ref={ref}
      // Taps reach buttons while the keyboard is up rather than being eaten by
      // the first tap dismissing it.
      keyboardShouldPersistTaps="handled"
      // Not `on-drag`: dragging is how you reach the content under the
      // keyboard, and dismissing on the first pixel of that drag is the very
      // thing being fixed. iOS gets the interactive drag-down instead.
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
      showsVerticalScrollIndicator={false}
      scrollIndicatorInsets={{ bottom: keyboard }}
      {...rest}>
      {children}
      {spacer > 0 ? <View pointerEvents="none" style={{ height: spacer }} /> : null}
    </ScrollView>
  );
});
