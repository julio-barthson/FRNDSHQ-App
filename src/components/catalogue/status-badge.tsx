import { Text, View } from 'react-native';

import type { ReleaseStatus } from '@/features/catalogue/types';

/**
 * Status tones as class pairs. `neutral` reuses the ink surfaces; the other
 * three carry their own dim surface and edge from the theme.
 */
const TONE = {
  neutral: 'border-line bg-ink-field',
  info: 'border-info-line bg-info-surface',
  good: 'border-positive-line bg-positive-surface',
  bad: 'border-danger-line bg-danger-surface',
} as const;

const TONE_TEXT = {
  neutral: 'text-muted',
  info: 'text-info',
  good: 'text-positive',
  bad: 'text-danger',
} as const;

interface Descriptor {
  label: string;
  tone: keyof typeof TONE;
}

/**
 * The wording is deliberate. Nothing in this build sets `DELIVERING`, `LIVE`
 * or `TAKEN_DOWN` — distribution is a later phase — and `READY` means the
 * release passed review and is stored, *not* that it reached any store. Saying
 * "Live" here would tell an artist their music is out when it is not.
 */
const DESCRIPTORS: Record<ReleaseStatus, Descriptor> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  SUBMITTED: { label: 'Submitted', tone: 'info' },
  IN_REVIEW: { label: 'In review', tone: 'info' },
  READY: { label: 'Approved', tone: 'good' },
  REJECTED: { label: 'Needs changes', tone: 'bad' },
  DELIVERING: { label: 'Delivering', tone: 'info' },
  LIVE: { label: 'Live', tone: 'good' },
  TAKEN_DOWN: { label: 'Taken down', tone: 'bad' },
};

/** One line of plain English under a release, where there is room for it. */
export const STATUS_EXPLAINER: Partial<Record<ReleaseStatus, string>> = {
  DRAFT: 'Not submitted yet.',
  SUBMITTED: 'Waiting to be reviewed.',
  IN_REVIEW: 'Being checked now.',
  READY: 'Passed review and stored with us.',
  REJECTED: 'Open it to see what needs fixing.',
};

export function statusLabel(status: ReleaseStatus): string {
  return DESCRIPTORS[status].label;
}

export function StatusBadge({ status }: { status: ReleaseStatus }) {
  const descriptor = DESCRIPTORS[status];

  return (
    <View
      accessibilityLabel={`Status: ${descriptor.label}`}
      className={`rounded-full border px-2 py-[3px] ${TONE[descriptor.tone]}`}>
      <Text className={`font-outfit-medium text-caption ${TONE_TEXT[descriptor.tone]}`}>
        {descriptor.label}
      </Text>
    </View>
  );
}
