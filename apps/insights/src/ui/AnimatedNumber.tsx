import React, { useEffect, useRef, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from './theme';

interface AnimatedNumberProps {
  /** Raw numeric value to display. Pass null/undefined to render the static fallback text as-is. */
  value: number | null | undefined;
  /** Formats the (possibly fractional, mid-count) numeric value into display text. */
  format: (value: number) => string;
  /** Text shown when `value` is null/undefined (e.g. the formatter's own "—"). */
  fallback: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  /** First-mount count-up duration. Subsequent value changes roll a bit faster. */
  duration?: number;
  adjustsFontSizeToFit?: boolean;
}

/**
 * A KPI figure that counts up from zero on first mount and rolls smoothly to a new
 * value when it changes (e.g. on refresh), instead of snapping. The driving
 * interpolation runs on the UI thread; only the committed display text crosses to
 * JS, and only when the rounded value actually changes.
 */
export function AnimatedNumber({
  value,
  format,
  fallback,
  style,
  numberOfLines = 1,
  duration = 700,
  adjustsFontSizeToFit,
}: AnimatedNumberProps) {
  const reducedMotion = useReducedMotion();
  const hasValue = value !== null && value !== undefined && !Number.isNaN(value);
  const progress = useSharedValue(hasValue ? value : 0);
  const [display, setDisplay] = useState(hasValue ? value : 0);
  const mounted = useRef(false);
  const prev = useRef<number | null>(hasValue ? value : null);

  useEffect(() => {
    if (!hasValue) return;
    const easing = Easing.out(Easing.cubic);
    if (!mounted.current) {
      mounted.current = true;
      if (reducedMotion) {
        progress.value = value;
        setDisplay(value);
      } else {
        progress.value = 0;
        progress.value = withTiming(value, { duration, easing });
      }
    } else if (prev.current !== value) {
      if (reducedMotion) {
        progress.value = value;
        setDisplay(value);
      } else {
        progress.value = withTiming(value, { duration: Math.min(duration, 550), easing });
      }
    }
    prev.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, hasValue, reducedMotion]);

  useAnimatedReaction(
    () => progress.value,
    (current, previous) => {
      if (previous === null || Math.round(current) !== Math.round(previous)) {
        runOnJS(setDisplay)(current);
      }
    },
    []
  );

  if (!hasValue) {
    return (
      <Text style={style} numberOfLines={numberOfLines} adjustsFontSizeToFit={adjustsFontSizeToFit}>
        {fallback}
      </Text>
    );
  }

  return (
    <Text style={style} numberOfLines={numberOfLines} adjustsFontSizeToFit={adjustsFontSizeToFit}>
      {format(display)}
    </Text>
  );
}
