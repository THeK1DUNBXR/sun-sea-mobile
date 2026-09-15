import React, { useEffect, useState } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { layout, radius, spacing, useReducedMotion, usePalette } from './theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: object;
}

export function Skeleton({ width = '100%', height = 16, radius: r = radius.sm, style }: SkeletonProps) {
  const palette = usePalette();
  const reducedMotion = useReducedMotion();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const sweep = useSharedValue(-1);

  useEffect(() => {
    if (reducedMotion || measuredWidth === 0) return;
    sweep.value = -1;
    sweep.value = withRepeat(
      withSequence(
        withTiming(-1, { duration: 0 }),
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, measuredWidth]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sweep.value * measuredWidth }],
  }));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setMeasuredWidth(e.nativeEvent.layout.width)}
      style={[
        { width, height, borderRadius: r, backgroundColor: palette.overlay, overflow: 'hidden' },
        style,
      ]}
    >
      {reducedMotion ? (
        // A single soft fill, no motion — still legibly "loading" without spatial movement.
        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.overlay, opacity: 0.6 }]} />
      ) : measuredWidth > 0 ? (
        <Reanimated.View style={[StyleSheet.absoluteFill, sweepStyle]}>
          <Svg width={measuredWidth} height={height}>
            <Defs>
              <LinearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={palette.text} stopOpacity={0} />
                <Stop offset="0.5" stopColor={palette.text} stopOpacity={0.12} />
                <Stop offset="1" stopColor={palette.text} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={measuredWidth} height={height} fill="url(#shimmer)" />
          </Svg>
        </Reanimated.View>
      ) : null}
    </View>
  );
}

/** Mirrors the overview screen's real KPI shape — a hero, a 6-tile grid, then
 * a standalone wide tile — so the loading state never jumps in row count or
 * height once the real data replaces it. */
export function SkeletonKpiGrid() {
  return (
    <View style={{ gap: spacing.md }}>
      <Skeleton width="100%" height={112} radius={radius.xl} />
      <View style={styles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={styles.tile}>
            <Skeleton width="60%" height={11} />
            <Skeleton width="80%" height={26} style={{ marginTop: spacing.sm }} />
            <Skeleton width="45%" height={18} radius={radius.pill} style={{ marginTop: spacing.sm }} />
          </View>
        ))}
      </View>
      <Skeleton width="100%" height={72} radius={radius.xl} />
    </View>
  );
}

/** Mimics the final trend-chart layout: a plot area, a baseline and a legend row. */
export function SkeletonChart({ height = 200 }: { height?: number }) {
  const palette = usePalette();
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.chartPlot, { height, borderColor: palette.border }]}>
        <Skeleton width="100%" height={1} style={{ position: 'absolute', bottom: 22 }} />
        <View style={styles.chartBars}>
          {[0.4, 0.65, 0.5, 0.8, 0.6, 0.9, 0.7].map((h, i) => (
            <Skeleton key={i} width={10} height={Math.round((height - 40) * h)} radius={4} />
          ))}
        </View>
      </View>
      <View style={styles.legendRow}>
        <Skeleton width={64} height={11} />
        <Skeleton width={84} height={11} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 150,
    padding: layout.cardPadding,
  },
  chartPlot: {
    justifyContent: 'flex-end',
    paddingBottom: 24,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
