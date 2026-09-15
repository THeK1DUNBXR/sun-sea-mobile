import React, { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from './theme';

interface RevealProps {
  /** Stagger index; combined with `staggerMs` to compute the delay. Ignored if `delay` is set. */
  index?: number;
  /** Ms between each staggered sibling (default 40ms per the motion spec). */
  staggerMs?: number;
  /** Explicit delay in ms, overrides index-based stagger. */
  delay?: number;
  /** Rise distance in px for the entrance (default 10, within the 8-12px band). */
  distance?: number;
  /** 'y' rises from below (default); 'x' slides in from the trailing edge. */
  axis?: 'x' | 'y';
  /** Slide direction along the axis: for 'y', 1 rises up from below; for 'x', 1 slides in from the right. */
  direction?: 1 | -1;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * One-shot mount entrance: fade + a small rise (or slide), used to stagger sibling
 * cards/rows once when a screen or list first appears. Runs entirely on the UI
 * thread and never re-fires on re-render — only on mount, matching "once per mount".
 * Under reduced motion it fades only, with no spatial movement.
 */
export function Reveal({
  index = 0,
  staggerMs = 40,
  delay,
  distance = 10,
  axis = 'y',
  direction = 1,
  duration = 280,
  style,
  children,
}: RevealProps) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  const offset = useSharedValue(reducedMotion ? 0 : distance * direction);
  // Cap the queued stagger at 8 steps so a long list of siblings doesn't make the
  // last ones wait through an ever-growing delay (see animate.md: "cap the total delay").
  const resolvedDelay = delay ?? Math.min(index, 8) * staggerMs;

  useEffect(() => {
    const easing = Easing.out(Easing.cubic);
    opacity.value = withDelay(resolvedDelay, withTiming(1, { duration, easing }));
    if (!reducedMotion) {
      offset.value = withDelay(resolvedDelay, withTiming(0, { duration, easing }));
    }
    // Intentionally mount-only: this is a one-time entrance, not a data-driven effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [axis === 'y' ? { translateY: offset.value } : { translateX: offset.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
