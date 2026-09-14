import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { colors, radius, spacing, type, minTouch, androidRipple } from './theme';
import { useReducedMotion } from './useReducedMotion';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}

export function Chip({ label, selected, onPress, color }: ChipProps) {
  const active = Boolean(selected);
  const tint = color ?? colors.primary;
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.wrap, animatedStyle]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        hitSlop={4}
        android_ripple={androidRipple(active ? colors.onPrimary : tint, 0.2)}
        onPressIn={() => {
          scale.value = reduceMotion ? 1 : withSpring(0.96, { damping: 18, stiffness: 260 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 260 });
        }}
        style={({ pressed }) => [
          styles.chip,
          { borderColor: tint },
          active ? { backgroundColor: tint } : { backgroundColor: colors.chipBg },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={[styles.label, { color: active ? colors.onPrimary : tint }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginRight: spacing.sm, marginBottom: spacing.sm },
  chip: {
    minHeight: minTouch,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  // Chips carry mixed-case selectable copy (payment methods, outcomes), so
  // the label scale's wide tracking — meant for short all-caps tags — is
  // dropped here.
  label: { ...type.label, letterSpacing: 0 },
});
