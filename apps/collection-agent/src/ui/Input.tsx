import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  FadeOut,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, spacing, type } from './theme';
import { useReducedMotion } from './useReducedMotion';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  /** Bump this to a new value (e.g. a counter) to flash the field with a
   * brief highlight — used when another control fills it in for the user,
   * like a "Full outstanding" shortcut. */
  highlightSignal?: number;
}

export function Input({ label, error, style, onFocus, onBlur, highlightSignal, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);
  const reduceMotion = useReducedMotion();
  const highlight = useSharedValue(0);

  useEffect(() => {
    if (highlightSignal == null) return;
    highlight.value = reduceMotion
      ? withTiming(0, { duration: 1 })
      : withSequence(
          withTiming(1, { duration: 120, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 420, easing: Easing.inOut(Easing.ease) }),
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightSignal]);

  const highlightStyle = useAnimatedStyle(() => ({
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: interpolateColor(highlight.value, [0, 1], [colors.surface, colors.primaryTint]),
  }));

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Animated.View style={highlightStyle}>
        <TextInput
          placeholderTextColor={colors.textFaint}
          accessibilityLabel={label ?? rest.placeholder}
          style={[
            styles.input,
            focused && styles.inputFocused,
            error && styles.inputError,
            style,
          ]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
      </Animated.View>
      {error ? (
        <Animated.Text
          entering={reduceMotion ? undefined : FadeInUp.duration(160)}
          exiting={reduceMotion ? undefined : FadeOut.duration(120)}
          style={styles.error}
        >
          {error}
        </Animated.Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { ...type.label, color: colors.textMuted, marginBottom: spacing.xs },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    // A form control's own outline is load-bearing UI (≥3:1), unlike a
    // card's decorative divider — borderStrong, not border.
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...type.input,
    color: colors.text,
    backgroundColor: 'transparent',
  },
  inputFocused: { borderColor: colors.primary },
  inputError: { borderColor: colors.danger },
  error: { ...type.body, color: colors.danger, marginTop: spacing.xs },
});
