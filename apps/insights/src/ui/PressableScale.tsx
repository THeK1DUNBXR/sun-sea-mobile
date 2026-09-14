import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { usePalette, useReducedMotion } from './theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  /** Resting-to-pressed scale factor (default 0.98 per the motion spec). */
  scaleTo?: number;
  /** Fires a light impact on press-in. Safe to leave on: expo-haptics is a project dependency. */
  haptic?: boolean;
  /** Android-only ripple color (Material feedback). Defaults to the theme's
   * quiet overlay tint; pass a stronger color for a press target sitting on
   * a colored fill (e.g. the accent-filled sign-in button). iOS never shows a
   * ripple — it keeps the scale/opacity feedback instead, per platform
   * convention. */
  rippleColor?: string;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
}

/** A Pressable that scales down slightly on press with a light haptic tick, used for cards and buttons.
 * On Android it also shows a Material ripple (the idiomatic touch feedback there); iOS relies on the
 * scale + any caller-supplied opacity dim instead, since a ripple would read as foreign on that platform. */
export function PressableScale({
  scaleTo = 0.98,
  haptic = true,
  rippleColor,
  style,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: PressableScaleProps) {
  const reducedMotion = useReducedMotion();
  const palette = usePalette();
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
      android_ripple={Platform.OS === 'android' ? { color: rippleColor ?? palette.overlay, borderless: false } : undefined}
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
