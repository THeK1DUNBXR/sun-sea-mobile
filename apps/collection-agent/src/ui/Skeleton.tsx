import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius } from './theme';
import { useReducedMotion } from './useReducedMotion';

interface SkeletonBlockProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** A single shimmering placeholder block. Loops a gentle opacity pulse on the
 * UI thread; under Reduce Motion it renders as a static muted block instead. */
export function SkeletonBlock({ width = '100%', height = 14, radius: r = radius.sm, style }: SkeletonBlockProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(opacity);
      opacity.value = 0.6;
      return;
    }
    opacity.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, [reduceMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.block,
        { width, height, borderRadius: r },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** A stack of skeleton lines mimicking a card's title + subtitle rhythm. */
export function SkeletonCard({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.card, style]}>
      <SkeletonBlock width="55%" height={12} />
      <SkeletonBlock width="80%" height={20} style={{ marginTop: 10 }} />
    </View>
  );
}

/** A skeleton mimicking one assignment/history row: avatar circle + two
 * lines + trailing amount. */
export function SkeletonRow({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.row, style]}>
      <SkeletonBlock width={44} height={44} radius={22} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBlock width="60%" height={14} />
        <SkeletonBlock width="40%" height={12} />
      </View>
      <SkeletonBlock width={60} height={18} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.border },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
  },
});
