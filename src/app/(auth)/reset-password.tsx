import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/ui/brand-mark';
import { KeyboardScroll } from '@/components/ui/keyboard-scroll';
import { AuthAlert } from '@/components/auth/auth-alert';
import { AuthButton } from '@/components/auth/auth-button';
import { AuthField } from '@/components/auth/auth-field';
import { Brand } from '@/constants/brand';
import { type Matchers } from '@/features/auth/field-errors';
import { useAuthErrors } from '@/features/auth/use-auth-errors';
import {
  requestPasswordReset,
  setNewPassword,
  verifyResetCode,
} from '@/features/auth/password-reset';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
/** `@Matches(/(?=.*[A-Za-z])(?=.*\d)/)` on `SetNewPasswordDto.newPassword`. */
const PASSWORD_PATTERN = /(?=.*[A-Za-z])(?=.*\d)/;

type FieldName = 'otp' | 'confirmPassword' | 'newPassword';

/**
 * `confirmPassword` precedes `newPassword` so "Passwords do not match" lands on
 * the field the user has to change, and `otp` precedes both because a code
 * that expires mid-flow is reported from the password step.
 */
const MATCHERS: Matchers<FieldName> = {
  otp: /^otp\b|\bcode\b/i,
  confirmPassword: /^confirmPassword\b|passwords do not match/i,
  newPassword: /^newPassword\b|password must/i,
};

type Stage = 'code' | 'password' | 'done';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; notice?: string }>();
  const email = params.email ?? '';

  const otpRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  /** The code last sent for checking, so a rejection is not retried in a loop. */
  const attemptedRef = useRef<string | null>(null);

  const [stage, setStage] = useState<Stage>('code');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const {
    fields: errors,
    formError,
    isNetworkError,
    setFields,
    clearField,
    capture,
  } = useAuthErrors<FieldName>();
  const [notice, setNotice] = useState<string | null>(params.notice ?? null);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((seconds) => (seconds <= 1 ? 0 : seconds - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function checkCode(code: string) {
    if (pending) return;

    attemptedRef.current = code;
    setPending(true);
    setFields({});

    try {
      // Checking does not consume the code, so the same one is sent again with
      // the new password below.
      await verifyResetCode(email, code);
      setNotice(null);
      setStage('password');
    } catch (error) {
      if (capture(error, MATCHERS).otp) otpRef.current?.focus();
    } finally {
      setPending(false);
    }
  }

  function onChangeOtp(next: string) {
    const digits = next.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(digits);
    setFields({});

    if (digits.length === OTP_LENGTH && digits !== attemptedRef.current) {
      void checkCode(digits);
    }
  }

  async function onResend() {
    if (resending || cooldown > 0) return;

    setResending(true);
    setFields({});

    try {
      const result = await requestPasswordReset(email);
      setNotice(result.message);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      // The old code is replaced server-side, so let the new one be tried.
      attemptedRef.current = null;
      setOtp('');
      setStage('code');
    } catch (error) {
      capture(error, MATCHERS);
    } finally {
      setResending(false);
    }
  }

  async function onSubmitPassword() {
    if (pending) return;

    const next: Partial<Record<FieldName, string>> = {};
    if (password.length < 8) next.newPassword = 'Password must be at least 8 characters.';
    else if (password.length > 72) next.newPassword = 'Password must not exceed 72 characters.';
    else if (!PASSWORD_PATTERN.test(password)) {
      next.newPassword = 'Password must contain at least one letter and one number.';
    }

    if (!confirmPassword) next.confirmPassword = 'Re-enter your new password.';
    else if (confirmPassword !== password) next.confirmPassword = 'Passwords do not match.';

    setFields(next);
    if (Object.keys(next).length > 0) {
      if (next.newPassword) passwordRef.current?.focus();
      else if (next.confirmPassword) confirmRef.current?.focus();
      return;
    }

    setPending(true);
    try {
      await setNewPassword({
        email,
        otp,
        newPassword: password,
        confirmPassword,
      });
      setStage('done');
    } catch (error) {
      const claimed = capture(error, MATCHERS);
      // An expired code cannot be fixed from the password fields.
      if (claimed.otp) setStage('code');
      else if (claimed.newPassword) passwordRef.current?.focus();
      else if (claimed.confirmPassword) confirmRef.current?.focus();
    } finally {
      setPending(false);
    }
  }

  const canResend = cooldown === 0 && !resending && !pending;

  // Reachable by deep link or a stale back-stack entry, where there is no
  // address to reset and every request would fail on validation instead.
  if (!email) return <Redirect href="/forgot-password" />;

  return (
    <View className="bg-ink flex-1">
      <StatusBar style="light" />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardScroll contentContainerClassName="grow items-center justify-center px-6 py-8">
          <View className="w-full max-w-[400px] gap-6">
            <BrandMark />
            {stage === 'done' ? (
              <>
                <View className="gap-2">
                  <Text className="font-outfit-bold text-display text-fg">Password updated</Text>
                  <Text className="font-outfit text-body text-muted">
                    You&apos;ve been signed out everywhere else. Sign in with your new password.
                  </Text>
                </View>

                <AuthButton label="Back to sign in" onPress={() => router.replace('/sign-in')} />
              </>
            ) : (
              <>
                <View className="gap-2">
                  <Text className="font-outfit-bold text-display text-fg">
                    {stage === 'code' ? 'Enter your code' : 'Choose a new password'}
                  </Text>
                  <Text className="font-outfit text-body text-muted">
                    {stage === 'code' ? (
                      <>
                        We sent a {OTP_LENGTH}-digit code to{' '}
                        <Text className="font-outfit-semibold text-fg">
                          {email || 'your email address'}
                        </Text>
                        . It expires in 10 minutes.
                      </>
                    ) : (
                      'Pick something you have not used on FRNDSHQ before.'
                    )}
                  </Text>
                </View>

                <AuthAlert
                  messages={[formError]}
                  onRetry={
                    isNetworkError
                      ? stage === 'code'
                        ? () => void checkCode(otp)
                        : onSubmitPassword
                      : undefined
                  }
                />

                {/* The notice is not an error, so it keeps its own calmer
                      treatment — and yields to the banner when both apply. */}
                {!formError && notice ? (
                  <View className="rounded-card border-line bg-ink-raised border p-4">
                    <Text className="font-outfit text-callout text-fg">{notice}</Text>
                  </View>
                ) : null}

                <View className="gap-4">
                  {stage === 'code' ? (
                    <>
                      <View className="gap-2">
                        <Text className="font-outfit-semibold text-label text-muted tracking-[0.2px]">
                          Reset code
                        </Text>
                        <TextInput
                          className={`rounded-field bg-ink-field font-outfit-semibold text-fg border px-4 py-4 text-center text-[24px] tracking-[8px] ${
                            errors.otp ? 'border-danger' : 'border-line'
                          }`}
                          value={otp}
                          ref={otpRef}
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
                          onSubmitEditing={() => void checkCode(otp)}
                          accessibilityLabel="Reset code"
                        />
                        {errors.otp ? (
                          <Text className="font-outfit text-label text-danger">{errors.otp}</Text>
                        ) : null}
                      </View>

                      <AuthButton
                        label="Continue"
                        pending={pending}
                        disabled={otp.length !== OTP_LENGTH}
                        onPress={() => void checkCode(otp)}
                      />
                    </>
                  ) : (
                    <>
                      <AuthField
                        label="New password"
                        value={password}
                        ref={passwordRef}
                        onChangeText={(value) => {
                          setPassword(value);
                          clearField('newPassword');
                        }}
                        error={errors.newPassword}
                        placeholder="At least 8 characters"
                        secure
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="new-password"
                        textContentType="newPassword"
                        autoFocus
                        returnKeyType="next"
                        submitBehavior="submit"
                        onSubmitEditing={() => confirmRef.current?.focus()}
                        editable={!pending}
                      />
                      {errors.newPassword ? null : (
                        <Text className="font-outfit text-label text-muted">
                          Must include at least one letter and one number.
                        </Text>
                      )}

                      <AuthField
                        ref={confirmRef}
                        label="Confirm new password"
                        value={confirmPassword}
                        onChangeText={(value) => {
                          setConfirmPassword(value);
                          clearField('confirmPassword');
                        }}
                        error={errors.confirmPassword}
                        placeholder="Re-enter your new password"
                        secure
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="new-password"
                        textContentType="newPassword"
                        returnKeyType="go"
                        onSubmitEditing={onSubmitPassword}
                        editable={!pending}
                      />

                      <AuthButton
                        label="Update password"
                        pending={pending}
                        onPress={onSubmitPassword}
                        className="mt-2"
                      />
                    </>
                  )}

                  <Pressable
                    onPress={() => void onResend()}
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

                <View className="flex-row flex-wrap justify-center">
                  <Pressable onPress={() => router.replace('/sign-in')} accessibilityRole="button">
                    <Text className="font-outfit-semibold text-blue-ink text-[15px]">
                      Back to sign in
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </KeyboardScroll>
      </SafeAreaView>
    </View>
  );
}
