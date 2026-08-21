import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthAlert } from '@/components/auth/auth-alert';
import { AuthButton } from '@/components/auth/auth-button';
import { CountryPicker } from '@/components/auth/country-picker';
import { FormField } from '@/components/ui/form-field';
import { Brand } from '@/constants/brand';
import { DEFAULT_COUNTRY_CODE, findCountry, type Country } from '@/constants/countries';
import { type Matchers } from '@/features/auth/field-errors';
import { useSession } from '@/features/auth/session';
import type { AccountType, ProfileInput } from '@/features/auth/types';
import { useAuthErrors } from '@/features/auth/use-auth-errors';

/** Mirrors the `@Matches` rule on the API's phone field. */
const E164_PATTERN = /^\+[1-9]\d{6,14}$/;
const BIO_MAX = 500;

type FieldName = 'accountType' | 'name' | 'phoneNumber' | 'country' | 'bio';

const MATCHERS: Matchers<FieldName> = {
  accountType: /^accountType\b|artist or a label/i,
  name: /^stageName\b|^legalName\b|\bname\b/i,
  phoneNumber: /^phoneNumber\b|phone number/i,
  country: /^country\b|two-letter code/i,
  bio: /^bio\b/i,
};

type Step = 'type' | 'contact' | 'profile';

/**
 * A label row has no bio, so its setup is one step shorter. The last entry is
 * the step that sends `isComplete`.
 */
function stepsFor(accountType: AccountType): Step[] {
  return accountType === 'LABEL' ? ['type', 'contact'] : ['type', 'contact', 'profile'];
}

function TypeCard({
  selected,
  title,
  body,
  onPress,
}: {
  selected: boolean;
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={`rounded-card gap-1 border p-4 ${
        selected
          ? 'border-violet bg-violet-surface'
          : 'border-line bg-ink-raised active:bg-ink-high'
      }`}>
      <Text
        className={`font-outfit-semibold text-heading ${selected ? 'text-violet-ink' : 'text-fg'}`}>
        {title}
      </Text>
      <Text className="font-outfit text-callout text-muted">{body}</Text>
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const { user, saveProfile, setAccountType, signOut } = useSession();

  const [step, setStep] = useState<Step>('type');
  const [accountType, setType] = useState<AccountType>('ARTIST');
  const [name, setName] = useState('');
  const [country, setCountry] = useState<Country>(
    () => findCountry(user?.country ?? DEFAULT_COUNTRY_CODE) ?? findCountry(DEFAULT_COUNTRY_CODE)!
  );
  const [nationalNumber, setNationalNumber] = useState('');
  const [bio, setBio] = useState('');

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const { fields: errors, formError, setFields, clearField, capture } = useAuthErrors<FieldName>();

  const steps = stepsFor(accountType);
  const stepIndex = steps.indexOf(step);
  const isLabel = accountType === 'LABEL';

  /** The API wants one E.164 string, not a country and a number. */
  function fullPhoneNumber() {
    const digits = nationalNumber.replace(/\D/g, '').replace(/^0+/, '');
    return `+${country.dialCode}${digits}`;
  }

  function validate(current: Step) {
    const next: Partial<Record<FieldName, string>> = {};

    if (current === 'type') {
      const trimmed = name.trim();
      const noun = isLabel ? 'Label name' : 'Artist name';
      if (trimmed.length < 2) next.name = `${noun} must be at least 2 characters.`;
      else if (trimmed.length > 100) next.name = `${noun} must not exceed 100 characters.`;
    }

    if (current === 'contact' && !nationalNumber.replace(/\D/g, '')) {
      next.phoneNumber = 'Enter your phone number.';
    } else if (current === 'contact' && !E164_PATTERN.test(fullPhoneNumber())) {
      next.phoneNumber = `That is not a valid number for ${country.name}.`;
    }

    if (current === 'profile' && bio.trim().length > BIO_MAX) {
      next.bio = `Bio must not exceed ${BIO_MAX} characters.`;
    }

    return next;
  }

  /** What a non-type step contributes. Per-step saves omit `isComplete`. */
  function payloadFor(current: Step): ProfileInput {
    const complete = current === steps[steps.length - 1];

    if (current === 'contact') {
      return {
        phoneNumber: fullPhoneNumber(),
        country: country.code,
        ...(complete ? { isComplete: true } : {}),
      };
    }

    const trimmed = bio.trim();
    return { ...(trimmed ? { bio: trimmed } : {}), isComplete: true };
  }

  async function onContinue() {
    if (pending) return;

    const next = validate(step);
    setFields(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      if (step === 'type') {
        // Creates the artist or label row. Re-callable while onboarding is
        // unfinished, so changing the answer here replaces the row.
        await setAccountType(accountType, name);
        setStep('contact');
      } else {
        // The save carrying `isComplete` flips `onboardingCompleted`, which
        // re-derives the session status and hands over to the tabs — there is
        // nothing to push.
        await saveProfile(payloadFor(step));
        if (step === 'contact' && !isLabel) setStep('profile');
      }
    } catch (error) {
      capture(error, MATCHERS);
    } finally {
      setPending(false);
    }
  }

  const heading =
    step === 'type'
      ? 'What are you setting up?'
      : step === 'contact'
        ? 'How do we reach you?'
        : 'Tell us about yourself';

  const subheading =
    step === 'type'
      ? 'This decides how your catalogue is organised. You can only choose once.'
      : step === 'contact'
        ? 'Used for account security and release notices, never shown publicly.'
        : 'A short introduction for your profile. You can skip this and add it later.';

  return (
    <View className="bg-ink flex-1">
      <StatusBar style="light" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <ScrollView
            contentContainerClassName="grow justify-center px-6 py-8"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}>
            <View className="w-full max-w-[400px] gap-6 self-center">
              {/* A bar rather than pips — a label's flow is two steps and an
                  artist's is three, so a proportion is honest where a fixed
                  row of dots would not be. */}
              <View className="gap-2">
                <View className="bg-ink-high h-[4px] overflow-hidden rounded-full">
                  <View
                    className="bg-violet h-full rounded-full"
                    style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
                  />
                </View>
                <Text className="font-outfit text-caption text-muted">
                  Step {stepIndex + 1} of {steps.length}
                </Text>
              </View>

              <Animated.View key={step} entering={FadeInDown.duration(320)} className="gap-6">
                <View className="gap-2">
                  <Text className="font-outfit-bold text-display text-fg">{heading}</Text>
                  <Text className="font-outfit text-body text-muted">{subheading}</Text>
                </View>

                <AuthAlert messages={[formError]} />

                {step === 'type' ? (
                  <View className="gap-4">
                    <View className="gap-2">
                      <TypeCard
                        selected={accountType === 'ARTIST'}
                        title="I'm an artist"
                        body="Release your own music under your name."
                        onPress={() => setType('ARTIST')}
                      />
                      <TypeCard
                        selected={accountType === 'LABEL'}
                        title="I'm a label"
                        body="Release on behalf of artists on your roster."
                        onPress={() => setType('LABEL')}
                      />
                    </View>

                    <FormField
                      label={isLabel ? 'Label name' : 'Artist name'}
                      value={name}
                      onChangeText={(value) => {
                        setName(value);
                        clearField('name');
                      }}
                      error={errors.name}
                      placeholder={isLabel ? 'Your label' : 'How you appear on stores'}
                      autoCapitalize="words"
                      autoCorrect={false}
                      maxCount={100}
                      editable={!pending}
                    />
                  </View>
                ) : step === 'contact' ? (
                  <View className="gap-4">
                    <View className="gap-2">
                      <Text className="font-outfit-semibold text-label text-muted tracking-[0.2px]">
                        Phone number
                      </Text>
                      <View
                        className={`rounded-field bg-ink-field flex-row items-center gap-2 border px-4 ${
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

                        <View className="bg-line my-2 w-[1px] self-stretch" />

                        <TextInput
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
                          accessibilityLabel="Phone number"
                        />
                      </View>
                      <Text
                        className={`font-outfit text-label ${
                          errors.phoneNumber ? 'text-danger' : 'text-muted'
                        }`}>
                        {errors.phoneNumber ?? `${country.name} · without the leading zero.`}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <FormField
                    label="Bio"
                    value={bio}
                    onChangeText={(value) => {
                      setBio(value);
                      clearField('bio');
                    }}
                    error={errors.bio}
                    placeholder="Where you're from, what you make…"
                    multiline
                    numberOfLines={5}
                    maxCount={BIO_MAX}
                    editable={!pending}
                    style={{ minHeight: 120, textAlignVertical: 'top' }}
                  />
                )}

                <AuthButton
                  label={stepIndex === steps.length - 1 ? 'Finish setup' : 'Continue'}
                  pending={pending}
                  onPress={() => void onContinue()}
                />

                {step === 'profile' ? (
                  <Pressable
                    onPress={() => void onContinue()}
                    disabled={pending}
                    accessibilityRole="button"
                    className="items-center py-2">
                    <Text className="font-outfit-semibold text-blue-ink text-[15px]">
                      Skip for now
                    </Text>
                  </Pressable>
                ) : null}
              </Animated.View>

              <View className="flex-row flex-wrap justify-center">
                <Text className="font-outfit text-muted text-[15px]">Not you? </Text>
                <Pressable onPress={() => void signOut()} accessibilityRole="button">
                  <Text className="font-outfit-semibold text-blue-ink text-[15px]">Sign out</Text>
                </Pressable>
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
