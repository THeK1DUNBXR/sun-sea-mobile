import React from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useReducedMotion } from './useReducedMotion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale target while pressed. Defaults to the app-wide 0.98. */
  scaleTo?: number;
}

/** Wraps interactive surfaces (cards acting as rows, custom touch targets)
 * with the same pressed-scale spring `Button` uses, so press feedback is
 * consistent everywhere a card is tappable. Runs on the UI thread; skipped
 * to a plain opacity dip under Reduce Motion. */
export function PressableScale({ children, style, scaleTo = 0.98, onPressIn, onPressOut, ...rest }: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const handlePressIn = (e: GestureResponderEvent) => {
    scale.value = reduceMotion ? 1 : withSpring(scaleTo, { damping: 18, stiffness: 260 });
    onPressIn?.(e);
  };
  const handlePressOut = (e: GestureResponderEvent) => {
    scale.value = withSpring(1, { damping: 18, stiffness: 260 });
    onPressOut?.(e);
  };

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
