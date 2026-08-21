import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
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

import { AuthButton } from '@/components/auth/auth-button';
import { AuthAlert } from '@/components/auth/auth-alert';
import { AuthField } from '@/components/auth/auth-field';
import { type Matchers } from '@/features/auth/field-errors';
import { useAuthErrors } from '@/features/auth/use-auth-errors';
import { requestPasswordReset } from '@/features/auth/password-reset';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MATCHERS: Matchers<'email'> = { email: /^email\b|email address/i };

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const emailRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const { fields, formError, isNetworkError, setFields, clearField, capture } =
    useAuthErrors<'email'>();

  async function onSubmit() {
    if (pending) return;

    const trimmed = email.trim();
    const invalid = !trimmed
      ? 'Enter your email address.'
      : !EMAIL_PATTERN.test(trimmed)
        ? 'That does not look like an email address.'
        : null;

    if (invalid) {
      setFields({ email: invalid });
      emailRef.current?.focus();
      return;
    }

    setFields({});
    setPending(true);

    try {
      const result = await requestPasswordReset(trimmed);
      // The reply is identical for an unknown address, so it is carried to the
      // next screen and shown verbatim rather than reworded into a claim that
      // an account exists.
      router.push({
        pathname: '/reset-password',
        params: { email: trimmed.toLowerCase(), notice: result.message },
      });
    } catch (error) {
      if (capture(error, MATCHERS).email) emailRef.current?.focus();
    } finally {
      setPending(false);
    }
  }

  return (
    <View className="bg-ink flex-1">
      <StatusBar style="light" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* `className` does not reach `SafeAreaView` — react-native-css wraps the
          react-native components and `SafeAreaProvider`, but re-exports this one
          untouched, so its flex has to be a style. */}
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <ScrollView
            contentContainerClassName="grow items-center justify-center px-6 py-8"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}>
            <View className="w-full max-w-[400px] gap-6">
              <View className="gap-2">
                <Text className="font-outfit-bold text-display text-fg">Reset your password</Text>
                <Text className="font-outfit text-body text-muted">
                  Enter the email address on your account and we&apos;ll send you a 6-digit code.
                </Text>
              </View>

              <AuthAlert messages={[formError]} onRetry={isNetworkError ? onSubmit : undefined} />

              <View className="gap-4">
                <AuthField
                  label="Email"
                  ref={emailRef}
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    clearField('email');
                  }}
                  error={fields.email}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  autoFocus
                  returnKeyType="go"
                  onSubmitEditing={onSubmit}
                  editable={!pending}
                />

                <AuthButton
                  label="Send code"
                  pending={pending}
                  onPress={onSubmit}
                  className="mt-2"
                />
              </View>

              <View className="flex-row flex-wrap justify-center">
                <Text className="font-outfit text-muted text-[15px]">Remembered it? </Text>
                <Pressable onPress={() => router.back()} accessibilityRole="button">
                  <Text className="font-outfit-semibold text-blue-ink text-[15px]">
                    Back to sign in
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
