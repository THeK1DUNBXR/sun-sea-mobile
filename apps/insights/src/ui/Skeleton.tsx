import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type DimensionValue } from 'react-native';

import { radius, usePalette } from './theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: object;
}

export function Skeleton({ width = '100%', height = 16, radius: r = radius.sm, style }: SkeletonProps) {
  const palette = usePalette();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
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
      {Array.from({ length: 8 }).map((_, i) => (
        <View key={i} style={styles.tile}>
          <Skeleton width="60%" height={12} />
          <Skeleton width="80%" height={26} style={{ marginTop: 8 }} />
          <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 150,
    padding: 16,
  },
});
