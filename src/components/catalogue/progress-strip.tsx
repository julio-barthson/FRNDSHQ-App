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
      {/* One row, one column per stage, each centring its own dot over its own
          label. It was two separate rows before, built to different rules: the
          dots row gave each stage `flex-1` but then laid the dot and its
          connector side by side inside that share, so every dot sat at the
          start of its column rather than the middle of it — and the last stage,
          having no connector after it, spread across its whole share alone. The
          labels underneath were plain left-aligned text. Neither row agreed with
          the other and the strip as a whole sat visibly left of centre.

          The connectors are absolutely positioned now, running from one dot's
          centre to the next, so they join the dots without taking any part in
          how the columns are measured. */}
      <View className="flex-row">
        {STAGES.map((stage, index) => {
          const done = index < activeIndex;
          const isNext = index === activeIndex;

          return (
            <View key={stage.label} className="flex-1 items-center gap-2">
              <View className="h-[24px] w-full items-center justify-center">
                {/* Runs from this dot's centre to the next one's. Absolute, so
                    the column's width stays exactly one share of the row. */}
                {index < STAGES.length - 1 ? (
                  <View
                    className={`absolute top-[11px] right-0 left-1/2 h-[2px] ${
                      index < activeIndex ? 'bg-blue' : 'bg-line'
                    }`}
                  />
                ) : null}
                {index > 0 ? (
                  <View
                    className={`absolute top-[11px] right-1/2 left-0 h-[2px] ${
                      index <= activeIndex ? 'bg-blue' : 'bg-line'
                    }`}
                  />
                ) : null}

                <View
                  className={`h-[24px] w-[24px] items-center justify-center rounded-full border ${
                    done
                      ? 'border-blue bg-blue'
                      : isNext
                        ? 'border-blue-ink bg-blue-surface'
                        : 'border-line bg-ink-high'
                  }`}>
                  {done ? (
                    <Ionicons name="checkmark" size={14} color={Brand.white} />
                  ) : (
                    <Text
                      className={`font-outfit-semibold text-caption ${
                        isNext ? 'text-blue-ink' : 'text-muted'
                      }`}>
                      {index + 1}
                    </Text>
                  )}
                </View>
              </View>

              <Text
                className={`font-outfit text-caption text-center ${
                  index <= activeIndex ? 'text-fg' : 'text-muted'
                }`}
                numberOfLines={1}>
                {stage.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
