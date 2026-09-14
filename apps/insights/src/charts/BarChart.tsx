import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { usePalette } from '@/ui/theme';

interface InlineBarProps {
  /** 0..1 */
  fraction: number;
  color?: string;
  height?: number;
  width?: number;
}

/** A small horizontal progress-style bar, used inline in list rows (e.g. leaderboard). */
export function InlineBar({ fraction, color, height = 7, width = 60 }: InlineBarProps) {
  const palette = usePalette();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
  return (
    <View
      style={[styles.track, { height, width, backgroundColor: palette.overlay }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width * clamped} height={height} rx={height / 2} fill={color ?? palette.accent} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: 999,
    overflow: 'hidden',
  },
});
