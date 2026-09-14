import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type DimensionValue } from 'react-native';

import { radius, spacing, useReducedMotion, usePalette } from './theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: object;
}

export function Skeleton({ width = '100%', height = 16, radius: r = radius.sm, style }: SkeletonProps) {
  const palette = usePalette();
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(0.55);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reducedMotion]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: r, backgroundColor: palette.overlay, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonKpiGrid() {
  return (
    <View style={styles.grid}>
      <Skeleton width="100%" height={112} radius={radius.xl} />
      {Array.from({ length: 7 }).map((_, i) => (
        <View key={i} style={styles.tile}>
          <Skeleton width="60%" height={11} />
          <Skeleton width="80%" height={26} style={{ marginTop: 10 }} />
          <Skeleton width="45%" height={18} radius={999} style={{ marginTop: 10 }} />
        </View>
      ))}
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
    padding: spacing.lg,
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
