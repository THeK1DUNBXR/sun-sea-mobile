import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, type, spacing } from './theme';
import { useReducedMotion } from './useReducedMotion';

interface GpsStatusProps {
  /** null/undefined while still acquiring a fix. */
  label: string;
  locked: boolean;
  /** Spoken alternative for TalkBack/VoiceOver — raw lat/lng digits read
   * aloud one at a time are not useful, so callers can pass a plain-language
   * version ("Location captured, accuracy about 12 meters") instead. Falls
   * back to the visible label when omitted. */
  accessibilityLabel?: string;
}

/** The location line on collection/visit forms: a soft pulse while GPS is
 * still searching, settling into a steady locked mark once a fix lands. */
export function GpsStatus({ label, locked, accessibilityLabel }: GpsStatusProps) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);
  const settle = useSharedValue(locked ? 1 : 0.85);

  useEffect(() => {
    if (locked || reduceMotion) {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 150 });
      return;
    }
    pulse.value = withRepeat(
      withTiming(0.35, { duration: 650, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [locked, reduceMotion, pulse]);

  useEffect(() => {
    if (!locked) return;
    settle.value = reduceMotion
      ? withTiming(1, { duration: 1 })
      : withSequence(withTiming(1.15, { duration: 120 }), withSpring(1, { damping: 10, stiffness: 220 }));
  }, [locked, reduceMotion, settle]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: locked ? 1 : pulse.value }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: settle.value }] }));

  return (
    <View style={styles.row} accessible accessibilityLabel={accessibilityLabel ?? label}>
      <View style={styles.iconSlot}>
        {locked ? (
          <Animated.View style={iconStyle}>
            {/* Info/tracking, not success — a GPS lock is a live status, not
                a completed/positive outcome (that stays reserved for
                collected/verified/done). */}
            <Ionicons name="location" size={18} color={colors.info} />
          </Animated.View>
        ) : (
          <>
            <Ionicons name="location-outline" size={18} color={colors.textMuted} />
            <Animated.View style={[styles.searchDot, dotStyle]} />
          </>
        )}
      </View>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconSlot: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  searchDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.warning,
  },
  text: { ...type.body, color: colors.textMuted, flex: 1, fontVariant: ['tabular-nums'] },
});
