import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { colors, radius, spacing, type, elevation, minTouch, androidRipple } from './theme';
import { useReducedMotion } from './useReducedMotion';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  accessibilityLabel?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  icon,
  fullWidth = true,
  accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedWrapperStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  // Android gets its own conventional ripple instead of the ported
  // scale/opacity feedback; iOS keeps the scale spring below untouched.
  const ripple = androidRipple(variant === 'primary' || variant === 'danger' ? colors.onPrimary : colors.primary, 0.2);

  return (
    <Animated.View style={[fullWidth && styles.fullWidth, animatedWrapperStyle, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        hitSlop={4}
        android_ripple={isDisabled ? undefined : ripple}
        onPress={isDisabled ? undefined : onPress}
        onPressIn={() => {
          if (isDisabled) return;
          scale.value = reduceMotion ? 1 : withSpring(0.98, { damping: 18, stiffness: 260 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 260 });
        }}
        style={({ pressed }) => [
          styles.base,
          variantStyles[variant],
          variant === 'primary' && !isDisabled && elevation.card,
          isDisabled && styles.disabled,
          pressed && !isDisabled && pressedStyles[variant],
        ]}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? colors.primary : colors.onPrimary} />
        ) : (
          <View style={styles.content}>
            {icon}
            {/* No numberOfLines cap — minHeight (not a fixed height) lets the
                button grow to fit a wrapped second line at large Android font
                scale / Dynamic Type instead of truncating the label. */}
            <Text style={[styles.text, textStyles[variant]]}>{title}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouch + 4,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  text: { ...type.title, flexShrink: 1, textAlign: 'center' },
  disabled: { opacity: 0.45 },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary },
  danger: { backgroundColor: colors.danger },
  ghost: { backgroundColor: 'transparent' },
});

const pressedStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primaryDark },
  secondary: { backgroundColor: colors.primaryTint },
  danger: { backgroundColor: colors.dangerDark },
  ghost: { backgroundColor: colors.chipBg },
});

const textStyles = StyleSheet.create({
  primary: { color: colors.onPrimary },
  secondary: { color: colors.primary },
  danger: { color: colors.onPrimary },
  ghost: { color: colors.primary },
});
