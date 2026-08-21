import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthAlert } from '@/components/auth/auth-alert';
import { AuthButton } from '@/components/auth/auth-button';
import { AuthField } from '@/components/auth/auth-field';
import { CountryPicker } from '@/components/auth/country-picker';
import { AuthDivider, GoogleButton } from '@/components/auth/google-button';
import { Brand } from '@/constants/brand';
import { DEFAULT_COUNTRY_CODE, findCountry, type Country } from '@/constants/countries';
import { type Matchers } from '@/features/auth/field-errors';
import { useAuthErrors } from '@/features/auth/use-auth-errors';
import { useSession } from '@/features/auth/session';
import { useGoogleAuth } from '@/features/auth/use-google-auth';
import { GOOGLE_SIGN_IN_ENABLED } from '@/lib/env';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Mirrors the `@Matches` rule on `RegisterUserDto.phoneNumber`. */
const E164_PATTERN = /^\+[1-9]\d{6,14}$/;
/** `@Matches(/(?=.*[A-Za-z])(?=.*\d)/)` on the same DTO. */
const PASSWORD_PATTERN = /(?=.*[A-Za-z])(?=.*\d)/;

type FieldName =
  'email' | 'country' | 'phoneNumber' | 'confirmPassword' | 'password' | 'acceptTerms';

/** `confirmPassword` is listed before `password` so it claims its own message. */
const MATCHERS: Matchers<FieldName> = {
  email: /^email\b|email address|account with that email/i,
  country: /^country\b|two-letter code/i,
  phoneNumber: /^phoneNumber\b|phone number/i,
  confirmPassword: /^confirmPassword\b|passwords do not match/i,
  password: /^password\b|password must/i,
  acceptTerms: /^acceptTerms\b|terms of service/i,
};

/** Visual order, so focus lands on the topmost problem rather than the first match. */
const FIELD_ORDER: FieldName[] = [
  'email',
  'country',
  'phoneNumber',
  'password',
  'confirmPassword',
  'acceptTerms',
];

export default function SignUpScreen() {
  const { register } = useSession();
  const google = useGoogleAuth();

  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [country, setCountry] = useState<Country>(() => findCountry(DEFAULT_COUNTRY_CODE)!);
  const [nationalNumber, setNationalNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const {
    fields: errors,
    formError,
    isNetworkError,
    setFields,
    clearField,
    capture,
  } = useAuthErrors<FieldName>();
  const [pending, setPending] = useState(false);

  /**
   * Sends focus to the first field in error. `country` and `acceptTerms` are
   * not text inputs and cannot take focus — their messages sit beside the
   * control they belong to, and the banner announces them.
   */
  function focusFirstError(next: Partial<Record<FieldName, string>>) {
    const refs: Partial<Record<FieldName, React.RefObject<TextInput | null>>> = {
      email: emailRef,
      phoneNumber: phoneRef,
      password: passwordRef,
      confirmPassword: confirmRef,
    };

    const first = FIELD_ORDER.find((field) => next[field]);
    if (first) refs[first]?.current?.focus();
  }

  /** The API wants one E.164 string, not a country and a number. */
  function fullPhoneNumber() {
    // A number entered in local form usually carries a trunk zero, which E.164
    // does not allow after the country code.
    const digits = nationalNumber.replace(/\D/g, '').replace(/^0+/, '');
    return `+${country.dialCode}${digits}`;
  }

  function validate() {
    const next: Partial<Record<FieldName, string>> = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) next.email = 'Enter your email address.';
    else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      next.email = 'That does not look like an email address.';
    }

    if (!nationalNumber.replace(/\D/g, '')) next.phoneNumber = 'Enter your phone number.';
    else if (!E164_PATTERN.test(fullPhoneNumber())) {
      next.phoneNumber = `That is not a valid number for ${country.name}.`;
    }

    if (password.length < 8) next.password = 'Password must be at least 8 characters.';
    else if (password.length > 72) next.password = 'Password must not exceed 72 characters.';
    else if (!PASSWORD_PATTERN.test(password)) {
      next.password = 'Password must contain at least one letter and one number.';
    }

    if (!confirmPassword) next.confirmPassword = 'Re-enter your password.';
    else if (confirmPassword !== password) next.confirmPassword = 'Passwords do not match.';

    if (!acceptTerms) next.acceptTerms = 'You must accept the terms to continue.';

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
      // The session provider moves to `unverified` on success, which swaps the
      // navigator to the verification step — nothing to navigate to here.
      // `whitelist` and `forbidNonWhitelisted` are both on in the API's
      // ValidationPipe, so this body must carry the DTO's fields and no others.
      // The display name is not among them: it is asked for in onboarding,
      // where the account type is finally known.
      await register({
        email: email.trim().toLowerCase(),
        phoneNumber: fullPhoneNumber(),
        country: country.code,
        password,
        confirmPassword,
        acceptTerms,
      });
    } catch (error) {
      focusFirstError(capture(error, MATCHERS));
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
                <Text className="font-outfit-bold text-display text-fg">Create your account</Text>
                <Text className="font-outfit text-body text-muted">
                  Set up your artist profile on FRNDSHQ.
                </Text>
              </View>

              <AuthAlert
                messages={[formError, google.error]}
                onRetry={isNetworkError ? onSubmit : undefined}
              />

              <View className="gap-4">
                <AuthField
                  ref={emailRef}
                  label="Email"
                  autoFocus
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
                  onSubmitEditing={() => phoneRef.current?.focus()}
                  editable={!pending}
                />

                <View className="gap-2">
                  <Text className="font-outfit-semibold text-label text-muted tracking-[0.2px]">
                    Country
                  </Text>
                  <Pressable
                    onPress={() => {
                      clearField('country');
                      setPickerOpen(true);
                    }}
                    disabled={pending}
                    accessibilityRole="button"
                    accessibilityLabel={`Country, ${country.name}`}
                    className={`rounded-field bg-ink-field flex-row items-center justify-between border px-4 py-[15px] ${
                      errors.country ? 'border-danger' : 'border-line'
                    }`}>
                    <Text className="font-outfit text-body text-fg">{country.name}</Text>
                    <Text className="font-outfit text-muted text-[14px]">▾</Text>
                  </Pressable>
                  {errors.country ? (
                    <Text className="font-outfit text-label text-danger">{errors.country}</Text>
                  ) : null}
                </View>

                <View className="gap-2">
                  <Text className="font-outfit-semibold text-label text-muted tracking-[0.2px]">
                    Phone number
                  </Text>
                  <View
                    className={`rounded-field bg-ink-field min-h-12 flex-row items-center gap-2 border px-4 ${
                      errors.phoneNumber ? 'border-danger' : 'border-line'
                    }`}>
                    <Pressable
                      onPress={() => setPickerOpen(true)}
                      disabled={pending}
                      accessibilityRole="button"
                      accessibilityLabel={`Calling code, plus ${country.dialCode}`}>
                      <Text className="font-outfit-semibold text-body text-fg">
                        +{country.dialCode}
                      </Text>
                    </Pressable>
                    {/* `hairlineWidth` is a runtime value — there is no class for it. */}
                    <View
                      className="bg-line my-2 self-stretch"
                      style={{ width: StyleSheet.hairlineWidth }}
                    />
                    <TextInput
                      ref={phoneRef}
                      className="font-outfit text-body text-fg flex-1 py-[14px]"
                      value={nationalNumber}
                      onChangeText={(value) => {
                        setNationalNumber(value);
                        clearField('phoneNumber');
                      }}
                      placeholder="801 234 5678"
                      placeholderTextColor={Brand.muted}
                      selectionColor={Brand.blue}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      textContentType="telephoneNumber"
                      editable={!pending}
                    />
                  </View>
                  <Text
                    className={`font-outfit text-label ${
                      errors.phoneNumber ? 'text-danger' : 'text-muted'
                    }`}>
                    {errors.phoneNumber ?? 'Without the leading zero.'}
                  </Text>
                </View>

                <AuthField
                  ref={passwordRef}
                  label="Password"
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    clearField('password');
                  }}
                  error={errors.password}
                  placeholder="At least 8 characters"
                  secure
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  editable={!pending}
                />
                {errors.password ? null : (
                  <Text className="font-outfit text-label text-muted">
                    Must include at least one letter and one number.
                  </Text>
                )}

                <AuthField
                  ref={confirmRef}
                  label="Confirm password"
                  value={confirmPassword}
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    clearField('confirmPassword');
                  }}
                  error={errors.confirmPassword}
                  placeholder="Re-enter your password"
                  secure
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="go"
                  onSubmitEditing={onSubmit}
                  editable={!pending}
                />

                <View className="gap-2">
                  <Pressable
                    onPress={() => {
                      setAcceptTerms((value) => !value);
                      clearField('acceptTerms');
                    }}
                    disabled={pending}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: acceptTerms }}
                    className="flex-row items-start gap-4 py-1">
                    {/* `mt-px` nudges the box onto the first line's optical centre. */}
                    <View
                      className={`mt-px h-[22px] w-[22px] items-center justify-center rounded-[6px] border-[1.5px] ${
                        acceptTerms ? 'border-blue bg-blue' : 'border-line'
                      }`}>
                      {acceptTerms ? (
                        <Text className="font-outfit-bold text-label text-white">✓</Text>
                      ) : null}
                    </View>
                    <Text className="font-outfit text-callout text-fg flex-1">
                      I agree to the FRNDSHQ Terms of Service and Privacy Policy.
                    </Text>
                  </Pressable>
                  {errors.acceptTerms ? (
                    <Text className="font-outfit text-label text-danger">{errors.acceptTerms}</Text>
                  ) : null}
                </View>

                <AuthButton
                  label="Create account"
                  pending={pending}
                  onPress={onSubmit}
                  className="mt-2"
                />

                {GOOGLE_SIGN_IN_ENABLED ? (
                  <>
                    <AuthDivider />
                    <GoogleButton
                      label="Continue with Google"
                      onPress={google.signIn}
                      pending={google.pending}
                      disabled={!google.ready || pending}
                    />
                    <Text className="font-outfit text-label text-muted">
                      Continuing with Google also accepts the FRNDSHQ Terms of Service and Privacy
                      Policy.
                    </Text>
                  </>
                ) : null}
              </View>

              <View className="flex-row flex-wrap justify-center">
                <Text className="font-outfit text-muted text-[15px]">
                  Already have an account?{' '}
                </Text>
                <Link href="/sign-in" replace>
                  <Text className="font-outfit-semibold text-blue-ink text-[15px]">Sign in</Text>
                </Link>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <CountryPicker
        visible={pickerOpen}
        selectedCode={country.code}
        onSelect={setCountry}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}
