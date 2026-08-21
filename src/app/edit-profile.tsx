import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthAlert } from '@/components/auth/auth-alert';
import { FormField } from '@/components/ui/form-field';
import { Brand } from '@/constants/brand';
import { type Matchers } from '@/features/auth/field-errors';
import { useSession } from '@/features/auth/session';
import { useAuthErrors } from '@/features/auth/use-auth-errors';

const BIO_MAX = 500;

type FieldName = 'firstName' | 'lastName' | 'stageName' | 'legalName' | 'bio';

const MATCHERS: Matchers<FieldName> = {
  firstName: /^firstName\b|first name/i,
  lastName: /^lastName\b|last name/i,
  stageName: /^stageName\b|stage name/i,
  legalName: /^legalName\b|legal name/i,
  bio: /^bio\b/i,
};

function Group({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(340)} className="gap-2">
      <Text className="font-outfit-medium text-caption text-muted">{title}</Text>
      <View className="bg-ink-raised rounded-card gap-4 p-4">{children}</View>
    </Animated.View>
  );
}

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, saveProfile } = useSession();

  const isLabel = user?.label != null;

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [stageName, setStageName] = useState(user?.artist?.stageName ?? user?.label?.name ?? '');
  const [legalName, setLegalName] = useState(user?.artist?.legalName ?? '');
  const [bio, setBio] = useState(user?.artist?.bio ?? '');
  const [saving, setSaving] = useState(false);

  const { fields: errors, formError, setFields, clearField, capture } = useAuthErrors<FieldName>();

  const dirty =
    firstName !== (user?.firstName ?? '') ||
    lastName !== (user?.lastName ?? '') ||
    stageName !== (user?.artist?.stageName ?? user?.label?.name ?? '') ||
    legalName !== (user?.artist?.legalName ?? '') ||
    bio !== (user?.artist?.bio ?? '');

  function close() {
    if (!dirty) return router.back();

    Alert.alert('Discard changes?', 'Your edits to your profile will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  async function onSave() {
    if (saving || !dirty) return;

    const next: Partial<Record<FieldName, string>> = {};
    if (stageName.trim().length < 2) {
      next.stageName = `${isLabel ? 'Label name' : 'Artist name'} must be at least 2 characters.`;
    }
    if (bio.trim().length > BIO_MAX) next.bio = `Bio must not exceed ${BIO_MAX} characters.`;

    setFields(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      // Empty strings are dropped rather than stored as blanks; the API's
      // ValidationPipe rejects anything outside the DTO regardless.
      await saveProfile({
        ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
        ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
        ...(stageName.trim() ? { stageName: stageName.trim() } : {}),
        ...(legalName.trim() ? { legalName: legalName.trim() } : {}),
        ...(bio.trim() ? { bio: bio.trim() } : {}),
      });
      router.back();
    } catch (caught) {
      capture(caught, MATCHERS);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="bg-ink flex-1" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-4 px-4 pt-4 pb-4">
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}>
          <Ionicons name="close" size={26} color={Brand.white} />
        </Pressable>
        <Text className="font-outfit-bold text-title text-fg flex-1">Edit profile</Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="gap-6 px-4 pb-[140px]"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          <AuthAlert messages={[formError]} />

          <Group index={0} title={isLabel ? 'LABEL' : 'ARTIST'}>
            <FormField
              label={isLabel ? 'Label name' : 'Artist name'}
              value={stageName}
              onChangeText={(value) => {
                setStageName(value);
                clearField('stageName');
              }}
              error={errors.stageName}
              placeholder={isLabel ? 'Your label' : 'How you appear on stores'}
              autoCapitalize="words"
              maxCount={100}
              editable={!saving}
            />

            {!isLabel ? (
              <>
                <FormField
                  label="Legal name"
                  value={legalName}
                  onChangeText={(value) => {
                    setLegalName(value);
                    clearField('legalName');
                  }}
                  error={errors.legalName}
                  placeholder="Optional"
                  hint="Used on rights paperwork, never shown publicly."
                  autoCapitalize="words"
                  maxCount={100}
                  editable={!saving}
                />

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
                  editable={!saving}
                  style={{ minHeight: 120, textAlignVertical: 'top' }}
                />
              </>
            ) : null}
          </Group>

          <Group index={1} title="YOUR NAME">
            <FormField
              label="First name"
              value={firstName}
              onChangeText={(value) => {
                setFirstName(value);
                clearField('firstName');
              }}
              error={errors.firstName}
              placeholder="Optional"
              autoCapitalize="words"
              maxCount={100}
              editable={!saving}
            />
            <FormField
              label="Last name"
              value={lastName}
              onChangeText={(value) => {
                setLastName(value);
                clearField('lastName');
              }}
              error={errors.lastName}
              placeholder="Optional"
              autoCapitalize="words"
              maxCount={100}
              editable={!saving}
            />
          </Group>
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        className="border-line-subtle bg-ink absolute right-0 bottom-0 left-0 border-t px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}>
        <Pressable
          onPress={() => void onSave()}
          disabled={!dirty || saving}
          accessibilityRole="button"
          accessibilityState={{ disabled: !dirty, busy: saving }}
          className={`rounded-button min-h-[52px] items-center justify-center py-4 ${
            !dirty || saving ? 'bg-violet opacity-40' : 'bg-violet active:bg-violet-pressed'
          }`}>
          {saving ? (
            <ActivityIndicator color={Brand.white} />
          ) : (
            <Text className="font-outfit-bold text-body text-white">
              {dirty ? 'Save changes' : 'No changes to save'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
