import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthAlert } from '@/components/auth/auth-alert';
import { FormField } from '@/components/ui/form-field';
import { KeyboardScroll } from '@/components/ui/keyboard-scroll';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useToast } from '@/components/ui/toast';
import { Brand } from '@/constants/brand';
import { useSession } from '@/features/auth/session';
import { acceptSeat } from '@/features/label/api';
import { ApiError } from '@/lib/api';

const CODE_LENGTH = 6;

/**
 * Redeeming a label's invitation.
 *
 * Reachable from onboarding as well as Profile: someone invited to a label
 * signs up like anyone else and would otherwise be asked whether they are an
 * artist or a label — a question their account is not the answer to, and one
 * that creates a profile row nobody wanted if they guess.
 *
 * The server matches the code against the signed-in account's own email, so
 * there is no address to type here. A code alone opens nothing.
 */
export default function AcceptInviteScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user, refresh } = useSession();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onAccept() {
    if (pending) return;

    const digits = code.trim();
    if (digits.length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit code from your invitation email.`);
      return;
    }

    setPending(true);
    setError(null);
    try {
      const seat = await acceptSeat(digits);
      // Accepting can complete onboarding server-side, so the session has to be
      // re-read before the navigator will move them on.
      await refresh();
      toast.success(`You now have access to ${seat.artist.stageName}`);
      router.back();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Could not accept that invitation.'
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <View className="bg-ink flex-1" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        icon="close"
        label="Close"
        title="Accept an invitation"
        onPress={() => router.back()}
      />

      <KeyboardScroll contentContainerClassName="gap-6 px-4" bottomInset={insets.bottom + 100}>
        <AuthAlert messages={[error]} />

        <Text className="font-outfit text-callout text-muted">
          A label can give you access to an artist. Enter the code they emailed to{' '}
          <Text className="font-outfit-semibold text-fg">{user?.email ?? 'your address'}</Text>.
        </Text>

        <FormField
          label="Invitation code"
          value={code}
          onChangeText={(value) => {
            setCode(value.replace(/\D/g, '').slice(0, CODE_LENGTH));
            setError(null);
          }}
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          editable={!pending}
          autoFocus
        />
      </KeyboardScroll>

      <View
        className="border-line-subtle bg-ink absolute right-0 bottom-0 left-0 border-t px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}>
        <Pressable
          onPress={() => void onAccept()}
          disabled={pending || code.length !== CODE_LENGTH}
          accessibilityRole="button"
          accessibilityState={{ busy: pending, disabled: code.length !== CODE_LENGTH }}
          className={`rounded-button min-h-[52px] items-center justify-center py-4 ${
            pending || code.length !== CODE_LENGTH
              ? 'bg-blue opacity-40'
              : 'bg-blue active:bg-blue-pressed'
          }`}>
          {pending ? (
            <ActivityIndicator color={Brand.white} />
          ) : (
            <Text className="font-outfit-bold text-body text-white">Accept invitation</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
