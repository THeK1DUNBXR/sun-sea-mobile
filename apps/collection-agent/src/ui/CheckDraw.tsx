import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { colors } from './theme';

interface CheckDrawProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** Skip the stroke-in choreography and show the finished mark instantly. */
  instant?: boolean;
  onDone?: () => void;
}

/** Draws a checkmark stroke-by-stroke using two plain Views (short stroke,
 * then long stroke), anchored with `transformOrigin` and grown via scaleX —
 * a from-scratch "check-draw" that needs no SVG dependency. */
export function CheckDraw({ size = 34, color = colors.onPrimary, strokeWidth = 4, instant = false, onDone }: CheckDrawProps) {
  const shortProgress = useSharedValue(instant ? 1 : 0);
  const longProgress = useSharedValue(instant ? 1 : 0);

  useEffect(() => {
    if (instant) {
      onDone?.();
      return;
    }
    shortProgress.value = withDelay(80, withTiming(1, { duration: 140, easing: Easing.out(Easing.ease) }));
    longProgress.value = withDelay(
      220,
      withTiming(1, { duration: 220, easing: Easing.out(Easing.ease) }, (finished) => {
        if (finished && onDone) runOnJS(onDone)();
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instant]);

  // Geometry tuned for a 34x34 box: a short down-stroke, then a long
  // up-stroke, meeting at the checkmark's elbow.
  const unit = size / 34;

  const shortStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: '45deg' }, { scaleX: shortProgress.value }],
  }));
  const longStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: '-45deg' }, { scaleX: longProgress.value }],
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={[
          styles.stroke,
          {
            left: 6 * unit,
            top: 15 * unit,
            width: 9 * unit,
            height: strokeWidth,
            borderRadius: strokeWidth / 2,
            backgroundColor: color,
            transformOrigin: 'left center',
          },
          shortStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.stroke,
          {
            left: 12 * unit,
            top: 20.5 * unit,
            width: 17 * unit,
            height: strokeWidth,
            borderRadius: strokeWidth / 2,
            backgroundColor: color,
            transformOrigin: 'left center',
          },
          longStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stroke: { position: 'absolute' },
});
