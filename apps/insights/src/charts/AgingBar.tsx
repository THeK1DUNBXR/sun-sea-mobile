import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import Reanimated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import type { AgingBuckets } from '@/types';
import { formatMoneyCompact } from '@/utils/format';
import { spacing, useIsDark, useReducedMotion, usePalette } from '@/ui/theme';

const AnimatedRect = Reanimated.createAnimatedComponent(Rect);

/** One aging segment, growing its width from 0 up to its share of the bar (or rolling to a new share on refresh). */
function AgingSegment({
  x,
  targetWidth,
  color,
  height,
  rx,
  delayMs,
  reducedMotion,
}: {
  x: number;
  targetWidth: number;
  color: string;
  height: number;
  rx: number;
  delayMs: number;
  reducedMotion: boolean;
}) {
  const width = useSharedValue(reducedMotion ? targetWidth : 0);

  useEffect(() => {
    if (reducedMotion) {
      width.value = targetWidth;
      return;
    }
    width.value = withDelay(
      delayMs,
      withTiming(targetWidth, { duration: 550, easing: Easing.out(Easing.cubic) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetWidth, reducedMotion]);

  const animatedProps = useAnimatedProps(() => ({ width: Math.max(width.value, 0) }));

  if (targetWidth <= 0) return null;

  return <AnimatedRect x={x} y={0} width={targetWidth} height={height} rx={rx} fill={color} animatedProps={animatedProps} />;
}

interface AgingBarProps {
  aging: AgingBuckets | undefined;
  height?: number;
}

const BUCKET_KEYS: (keyof AgingBuckets)[] = ['0_30', '31_60', '61_90', '90_plus'];
const BUCKET_LABELS: Record<string, string> = {
  '0_30': '0–30 days',
  '31_60': '31–60 days',
  '61_90': '61–90 days',
  '90_plus': '90+ days',
};

export function AgingBar({ aging, height = 36 }: AgingBarProps) {
  const palette = usePalette();
  const dark = useIsDark();
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  // A deliberate green -> red severity ramp, kept visually distinct from the accent.
  const colors = [palette.good, palette.warn, dark ? '#FB923C' : '#EA580C', palette.bad];

  const values = BUCKET_KEYS.map((k) => aging?.[k] ?? 0);
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const worstIdx = values.reduce((best, v, i) => (v > values[best] && i > best ? i : best), 0);

  let cursor = 0;
  const segments = values.map((value, i) => {
    const segWidth = (value / total) * width;
    const seg = { x: cursor, width: segWidth, color: colors[i] };
    cursor += segWidth;
    return seg;
  });

  const a11yLabel = BUCKET_KEYS.map(
    (k, i) => `${BUCKET_LABELS[k]}: ${formatMoneyCompact(values[i])}`
  ).join('. ');

  return (
    <View>
      <View
        style={{ height }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessibilityRole="image"
        accessibilityLabel={`Receivables aging. ${a11yLabel}`}
      >
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Rect x={0} y={0} width={width} height={height} rx={height / 2} fill={palette.overlay} />
            {segments.map((seg, i) => (
              <AgingSegment
                key={i}
                x={seg.x}
                targetWidth={Math.max(seg.width - (i < segments.length - 1 ? 2 : 0), 0)}
                color={seg.color}
                height={height}
                rx={height / 2}
                delayMs={i * 60}
                reducedMotion={reducedMotion}
              />
            ))}
          </Svg>
        ) : null}
      </View>
      <View style={styles.legend}>
        {BUCKET_KEYS.map((key, i) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors[i] }]} />
            <View>
              <Text
                style={[
                  styles.legendAmount,
                  { color: i === worstIdx && values[i] > 0 ? colors[i] : palette.text },
                ]}
              >
                {formatMoneyCompact(values[i])}
              </Text>
              <Text style={[styles.legendLabel, { color: palette.textFaint }]}>{BUCKET_LABELS[key]}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.md,
    columnGap: spacing.lg,
    marginTop: spacing.lg,
  },
  legendItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, minWidth: '42%' },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 4 },
  legendAmount: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  legendLabel: { fontSize: 11.5, fontWeight: '600', marginTop: 1 },
});
