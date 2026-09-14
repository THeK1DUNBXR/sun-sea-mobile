import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReducedMotion } from './theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  /** Resting-to-pressed scale factor (default 0.98 per the motion spec). */
  scaleTo?: number;
  /** Fires a light impact on press-in. Safe to leave on: expo-haptics is a project dependency. */
  haptic?: boolean;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
}

/** A Pressable that scales down slightly on press with a light haptic tick, used for cards and buttons. */
export function PressableScale({
  scaleTo = 0.98,
  haptic = true,
  style,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: PressableScaleProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = (e: GestureResponderEvent) => {
    if (!reducedMotion) {
      scale.value = withTiming(scaleTo, { duration: 100, easing: Easing.out(Easing.cubic) });
    }
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    scale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) });
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={(state: { pressed: boolean }) => [
        animatedStyle,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}
