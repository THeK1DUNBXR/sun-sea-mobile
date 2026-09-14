import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import type { AgingBuckets } from '@/types';
import { formatMoneyCompact } from '@/utils/format';
import { spacing, usePalette } from '@/ui/theme';

interface AgingBarProps {
  aging: AgingBuckets | undefined;
  height?: number;
}

const BUCKET_KEYS: (keyof AgingBuckets)[] = ['0_30', '31_60', '61_90', '90_plus'];
const BUCKET_LABELS: Record<string, string> = {
  '0_30': '0–30d',
  '31_60': '31–60d',
  '61_90': '61–90d',
  '90_plus': '90d+',
};

export function AgingBar({ aging, height = 28 }: AgingBarProps) {
  const palette = usePalette();
  const [width, setWidth] = useState(0);
  const colors = [palette.good, palette.warn, '#E08A2C', palette.bad];

  const values = BUCKET_KEYS.map((k) => aging?.[k] ?? 0);
  const total = values.reduce((a, b) => a + b, 0) || 1;

  let cursor = 0;
  const segments = values.map((value, i) => {
    const segWidth = (value / total) * width;
    const seg = { x: cursor, width: segWidth, color: colors[i] };
    cursor += segWidth;
    return seg;
  });

  return (
    <View>
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            {segments.map((seg, i) =>
              seg.width > 0 ? (
                <Rect
                  key={i}
                  x={seg.x}
                  y={0}
                  width={Math.max(seg.width - (i < segments.length - 1 ? 1.5 : 0), 0)}
                  height={height}
                  rx={4}
                  fill={seg.color}
                />
              ) : null
            )}
          </Svg>
        ) : null}
      </View>
      <View style={styles.legend}>
        {BUCKET_KEYS.map((key, i) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors[i] }]} />
            <Text style={[styles.legendLabel, { color: palette.textMuted }]}>
              {BUCKET_LABELS[key]} · {formatMoneyCompact(aging?.[key] ?? 0)}
            </Text>
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
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: '45%' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11.5, fontWeight: '600' },
});
