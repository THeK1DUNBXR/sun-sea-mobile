import React, { useEffect, useRef, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { Easing, runOnJS, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReducedMotion } from './useReducedMotion';

interface AnimatedNumberProps {
  /** The real numeric value to display — pass 0/undefined-as-0 while loading
   * so the first real value counts up from zero. */
  value: number;
  /** Formats the (possibly fractional, mid-animation) number for display —
   * pass the same formatter used for the settled value, e.g. formatMoney. */
  formatter: (n: number) => string;
  duration?: number;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
}

/** A tabular-figures count-up: rolls from the previous value to the next
 * whenever `value` changes (first load, or a pull-to-refresh bringing a new
 * total). Falls back to an instant snap under Reduce Motion. */
export function AnimatedNumber({
  value,
  formatter,
  duration = 600,
  style,
  numberOfLines,
  adjustsFontSizeToFit,
}: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(value);
  const [display, setDisplay] = useState(value);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      // First paint: snap the reaction baseline without re-animating if the
      // initial value itself is already the settled one.
      mounted.current = true;
      progress.value = value;
      setDisplay(value);
      return;
    }
    if (reduceMotion) {
      progress.value = value;
      setDisplay(value);
      return;
    }
    progress.value = withTiming(value, { duration, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduceMotion]);

  useAnimatedReaction(
    () => progress.value,
    (current, previous) => {
      if (previous === null || Math.round(current) !== Math.round(previous)) {
        runOnJS(setDisplay)(current);
      }
    },
  );

  return (
    <Text style={style} numberOfLines={numberOfLines} adjustsFontSizeToFit={adjustsFontSizeToFit}>
      {formatter(display)}
    </Text>
  );
}
