import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/ui/brand-mark';
import { KeyboardScroll } from '@/components/ui/keyboard-scroll';
import { AuthAlert } from '@/components/auth/auth-alert';
import { AuthButton } from '@/components/auth/auth-button';
import { AuthField } from '@/components/auth/auth-field';
import { AuthDivider, GoogleButton } from '@/components/auth/google-button';
import { type Matchers } from '@/features/auth/field-errors';
import { useAuthErrors } from '@/features/auth/use-auth-errors';
import { useSession } from '@/features/auth/session';
import { useGoogleAuth } from '@/features/auth/use-google-auth';
import { GOOGLE_SIGN_IN_ENABLED } from '@/lib/env';

/** Deliberately permissive — the server is the authority on deliverability. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldName = 'email' | 'password';

/**
 * `LoginDto` mixes a custom message ("Please provide a valid email address")
 * with class-validator's defaults ("email should not be empty"), so each field
 * needs both spellings.
 */
const MATCHERS: Matchers<FieldName> = {
  email: /^email\b|email address/i,
  password: /^password\b/i,
};

/** Submit order, so the first message a user is sent to is the topmost one. */
const FIELD_ORDER: FieldName[] = ['email', 'password'];

export default function SignInScreen() {
  const { signIn } = useSession();
  const google = useGoogleAuth();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const errorState = useAuthErrors<FieldName>();
  const { fields: errors, formError, isNetworkError, setFields, clearField, capture } = errorState;

  /**
   * Moves focus to the first field in error. Without this a rejected submit
   * looks like nothing happened whenever the offending field is scrolled off
   * screen, and focusing it brings it into view as well as announcing it.
   */
  function focusFirstError(next: Partial<Record<FieldName, string>>) {
    const first = FIELD_ORDER.find((field) => next[field]);
    if (first === 'email') emailRef.current?.focus();
    else if (first === 'password') passwordRef.current?.focus();
  }

  function validate() {
    const next: Partial<Record<FieldName, string>> = {};
    const trimmed = email.trim();

    if (!trimmed) next.email = 'Enter your email address.';
    else if (!EMAIL_PATTERN.test(trimmed)) {
      next.email = 'That does not look like an email address.';
    }

    if (!password) next.password = 'Enter your password.';

    return next;
  }

  async function onSubmit() {
    if (pending) return;

    const next = validate();
    setFields(next);
    if (Object.keys(next).length > 0) {
      focusFirstError(next);
      return;
    }

    setPending(true);
    try {
      // On success the session status flips and the root layout swaps the
      // navigator — there is no navigation to perform here.
      await signIn(email, password);
    } catch (error) {
      focusFirstError(capture(error, MATCHERS));
    } finally {
      setPending(false);
    }
  }

  return (
    <View className="bg-ink flex-1">
      <StatusBar style="light" />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardScroll contentContainerClassName="grow items-center justify-center px-6 py-8">
          <View className="w-full max-w-[400px] gap-6">
            <BrandMark />
            <View className="gap-2">
              <Text className="font-outfit-bold text-display text-fg">Welcome back</Text>
              <Text className="font-outfit text-body text-muted">
                Sign in to your FRNDSHQ account.
              </Text>
            </View>

            <AuthAlert
              messages={[formError, google.error]}
              onRetry={isNetworkError ? onSubmit : undefined}
            />

            <View className="gap-4">
              <AuthField
                label="Email"
                ref={emailRef}
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  clearField('email');
                }}
                error={errors.email}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!pending}
              />

              <AuthField
                ref={passwordRef}
                label="Password"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  clearField('password');
                }}
                error={errors.password}
                placeholder="Your password"
                secure
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={onSubmit}
                editable={!pending}
              />

              {/* Sits under the password field, right-aligned, where the eye
                    expects it. The class goes on a Text inside the Link so
                    NativeWind is styling a component it knows. */}
              <View className="self-end">
                <Link href="/forgot-password">
                  <Text className="font-outfit-semibold text-blue-ink text-[14px]">
                    Forgot password?
                  </Text>
                </Link>
              </View>

              <AuthButton label="Sign in" pending={pending} onPress={onSubmit} className="mt-2" />

              {GOOGLE_SIGN_IN_ENABLED ? (
                <>
                  <AuthDivider />
                  <GoogleButton
                    label="Continue with Google"
                    onPress={google.signIn}
                    pending={google.pending}
                    disabled={!google.ready || pending}
                  />
                </>
              ) : null}
            </View>

            <View className="flex-row flex-wrap justify-center">
              <Text className="font-outfit text-muted text-[15px]">New to FRNDSHQ? </Text>
              <Link href="/sign-up" replace>
                <Text className="font-outfit-semibold text-blue-ink text-[15px]">
                  Create an account
                </Text>
              </Link>
            </View>
          </View>
        </KeyboardScroll>
      </SafeAreaView>
    </View>
  );
}
