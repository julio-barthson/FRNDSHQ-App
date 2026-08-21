import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthAlert } from '@/components/auth/auth-alert';
import { AuthButton } from '@/components/auth/auth-button';
import { Brand } from '@/constants/brand';
import { type Matchers } from '@/features/auth/field-errors';
import { useSession } from '@/features/auth/session';
import { useAuthErrors } from '@/features/auth/use-auth-errors';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

const MATCHERS: Matchers<'otp'> = { otp: /^otp\b|\bcode\b/i };

export default function VerifyEmailScreen() {
  const { pendingEmail, user, shouldSendCode, verifyEmail, resendCode, signOut } = useSession();

  const email = pendingEmail ?? user?.email ?? null;

  const [otp, setOtp] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const { fields, formError, isNetworkError, setFields, clearField, capture } =
    useAuthErrors<'otp'>();

  /** The code last handed to the API, so a rejection is not resubmitted. */
  const attemptedRef = useRef<string | null>(null);
  const autoSentRef = useRef(false);

  const send = async () => {
    setFields({});
    setResending(true);
    try {
      await resendCode();
      setNotice(`We sent a ${OTP_LENGTH}-digit code to ${email ?? 'your email'}.`);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      capture(error, MATCHERS);
    } finally {
      setResending(false);
    }
  };

  // Arriving from a sign-in that turned out to be unverified means no code has
  // been emailed yet. The ref keeps this to one send per mount even though
  // `send` is not a stable reference.
  useEffect(() => {
    if (!shouldSendCode || autoSentRef.current) return;
    autoSentRef.current = true;
    void send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldSendCode]);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((seconds) => (seconds <= 1 ? 0 : seconds - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  async function submit(code: string) {
    if (pending) return;

    if (code.length !== OTP_LENGTH) {
      setFields({ otp: `Enter the ${OTP_LENGTH}-digit code.` });
      return;
    }

    attemptedRef.current = code;
    setPending(true);
    setFields({});
    setNotice(null);

    try {
      // On success the session flips to `signedIn` (or `onboarding`) and the
      // root navigator swaps groups — nothing to navigate to here.
      await verifyEmail(code);
    } catch (error) {
      capture(error, MATCHERS);
    } finally {
      setPending(false);
    }
  }

  function onChangeOtp(next: string) {
    const digits = next.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(digits);
    clearField('otp');
    setNotice(null);

    // Submitting on the sixth digit saves a tap, but only once per code —
    // otherwise a rejection would be retried on every re-render.
    if (digits.length === OTP_LENGTH && digits !== attemptedRef.current) {
      void submit(digits);
    }
  }

  const canResend = cooldown === 0 && !resending && !pending;

  return (
    <View className="bg-ink flex-1">
      <StatusBar style="light" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <ScrollView
            contentContainerClassName="grow items-center justify-center px-6 py-8"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}>
            <View className="w-full max-w-[400px] gap-6">
              <View className="gap-2">
                <Text className="font-outfit-bold text-display text-fg">Confirm your email</Text>
                <Text className="font-outfit text-body text-muted">
                  Enter the {OTP_LENGTH}-digit code we sent to{' '}
                  <Text className="font-outfit-semibold text-fg">
                    {email ?? 'your email address'}
                  </Text>
                  .
                </Text>
              </View>

              <AuthAlert
                messages={[formError]}
                onRetry={isNetworkError ? () => void submit(otp) : undefined}
              />

              {!formError && notice ? (
                <View className="rounded-card border-line bg-ink-raised border p-4">
                  <Text className="font-outfit text-callout text-fg">{notice}</Text>
                </View>
              ) : null}

              <View className="gap-4">
                <View className="gap-2">
                  <Text className="font-outfit-semibold text-label text-muted tracking-[0.2px]">
                    Verification code
                  </Text>
                  <TextInput
                    className={`rounded-field bg-ink-field font-outfit-semibold text-fg border px-4 py-4 text-center text-[24px] tracking-[8px] ${
                      fields.otp ? 'border-danger' : 'border-line'
                    }`}
                    value={otp}
                    onChangeText={onChangeOtp}
                    placeholder="••••••"
                    placeholderTextColor={Brand.border}
                    selectionColor={Brand.blue}
                    keyboardType="number-pad"
                    maxLength={OTP_LENGTH}
                    autoFocus
                    editable={!pending}
                    textContentType="oneTimeCode"
                    autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                    returnKeyType="go"
                    onSubmitEditing={() => void submit(otp)}
                    accessibilityLabel={
                      fields.otp ? `Verification code, error: ${fields.otp}` : 'Verification code'
                    }
                  />
                  {fields.otp ? (
                    <Text className="font-outfit text-label text-danger">{fields.otp}</Text>
                  ) : null}
                </View>

                <AuthButton
                  label="Confirm email"
                  pending={pending}
                  disabled={otp.length !== OTP_LENGTH}
                  onPress={() => void submit(otp)}
                />

                <Pressable
                  onPress={() => void send()}
                  disabled={!canResend}
                  accessibilityRole="button"
                  className="items-center py-2">
                  <Text
                    className={`font-outfit-semibold text-[15px] ${
                      canResend ? 'text-blue-ink' : 'text-muted'
                    }`}>
                    {resending
                      ? 'Sending a new code…'
                      : cooldown > 0
                        ? `Resend code in ${cooldown}s`
                        : 'Send me a new code'}
                  </Text>
                </Pressable>
              </View>

              {/* The only way out. Without it an account that mistyped its
                  address at signup would be stuck on this screen forever. */}
              <View className="flex-row flex-wrap justify-center">
                <Text className="font-outfit text-muted text-[15px]">Wrong address? </Text>
                <Pressable onPress={() => void signOut()} accessibilityRole="button">
                  <Text className="font-outfit-semibold text-blue-ink text-[15px]">
                    Sign out and start again
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}
