import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { Brand } from '@/constants/brand';
import type { ReleaseStatus } from '@/features/catalogue/types';

/**
 * Where a release sits in the review process.
 *
 * Only shown once submitted — a draft has not entered the process, and drawing
 * an empty three-step track above an unfinished release implies a queue it is
 * not in. Ordered stages, so a status maps to an index rather than a lookup.
 */
const STAGES: { label: string; reached: ReleaseStatus[] }[] = [
  { label: 'Submitted', reached: ['SUBMITTED', 'IN_REVIEW', 'READY', 'DELIVERING', 'LIVE'] },
  { label: 'Approved', reached: ['READY', 'DELIVERING', 'LIVE'] },
  { label: 'Delivered', reached: ['LIVE'] },
];

export function ProgressStrip({ status }: { status: ReleaseStatus }) {
  const current = STAGES.findIndex((stage) => !stage.reached.includes(status));
  // -1 means every stage is behind it; otherwise the first unreached is next.
  const activeIndex = current === -1 ? STAGES.length : current;

  return (
    <View className="bg-ink-raised rounded-card gap-3 p-4">
      <View className="flex-row items-center">
        {STAGES.map((stage, index) => {
          const done = index < activeIndex;
          const isNext = index === activeIndex;

          return (
            <View key={stage.label} className="flex-1 flex-row items-center">
              <View
                className={`h-[24px] w-[24px] items-center justify-center rounded-full border ${
                  done
                    ? 'border-violet bg-violet'
                    : isNext
                      ? 'border-violet-ink bg-violet-surface'
                      : 'border-line bg-ink-high'
                }`}>
                {done ? (
                  <Ionicons name="checkmark" size={14} color={Brand.white} />
                ) : (
                  <Text
                    className={`font-outfit-semibold text-caption ${
                      isNext ? 'text-violet-ink' : 'text-muted'
                    }`}>
                    {index + 1}
                  </Text>
                )}
              </View>

              {index < STAGES.length - 1 ? (
                <View
                  className={`h-[2px] flex-1 ${index < activeIndex - 1 ? 'bg-violet' : 'bg-line'}`}
                />
              ) : null}
            </View>
          );
        })}
      </View>

      <View className="flex-row">
        {STAGES.map((stage, index) => (
          <Text
            key={stage.label}
            className={`font-outfit text-caption flex-1 ${
              index <= activeIndex ? 'text-fg' : 'text-muted'
            }`}>
            {stage.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
