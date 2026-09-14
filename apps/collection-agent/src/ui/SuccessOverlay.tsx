import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from './Button';
import { colors, radius, spacing, fontSize, elevation } from './theme';

interface SuccessOverlayProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  actionLabel: string;
  onAction: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

/** The "it worked" moment for collections, visits and deposits — a single
 * consistent, calm confirmation instead of the OS alert, so the agent gets a
 * clear, designed handoff before moving on. */
export function SuccessOverlay({
  visible,
  title,
  subtitle,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: SuccessOverlayProps) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (reduceMotion) {
      scale.setValue(1);
      opacity.setValue(1);
      return;
    }
    scale.setValue(0.9);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 6 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [visible, reduceMotion, scale, opacity]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onAction}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, elevation.raised, { opacity, transform: [{ scale }] }]}>
          <View style={styles.iconRing}>
            <Ionicons name="checkmark" size={34} color={colors.onPrimary} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.actions}>
            <Button title={actionLabel} onPress={onAction} />
            {secondaryLabel && onSecondary ? (
              <Button title={secondaryLabel} onPress={onSecondary} variant="ghost" />
            ) : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,31,23,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontSize: fontSize.xl, fontWeight: '900', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: fontSize.md, color: colors.textMuted, textAlign: 'center', marginTop: 2 },
  actions: { width: '100%', gap: spacing.sm, marginTop: spacing.lg },
});
