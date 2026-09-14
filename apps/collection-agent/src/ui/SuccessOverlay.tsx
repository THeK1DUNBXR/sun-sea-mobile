import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { CheckDraw } from './CheckDraw';
import { useReducedMotion } from './useReducedMotion';
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
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.4)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(10)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const [showCheck, setShowCheck] = useState(false);
  const [checkInstant, setCheckInstant] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!visible) {
      setShowCheck(false);
      return;
    }
    if (reduceMotion) {
      cardScale.setValue(1);
      cardOpacity.setValue(1);
      ringScale.setValue(1);
      ringOpacity.setValue(1);
      contentTranslate.setValue(0);
      contentOpacity.setValue(1);
      setCheckInstant(true);
      setShowCheck(true);
      return;
    }

    cardScale.setValue(0.9);
    cardOpacity.setValue(0);
    ringScale.setValue(0.4);
    ringOpacity.setValue(0);
    contentTranslate.setValue(10);
    contentOpacity.setValue(0);
    setCheckInstant(false);
    setShowCheck(false);

    // Choreography: card scales/fades in, the icon ring pops with a slight
    // overshoot, then the checkmark draws itself while the title/actions
    // rise into place — one authored "it worked" moment, not a single fade.
    Animated.sequence([
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 6 }),
      ]),
      Animated.parallel([
        Animated.timing(ringOpacity, { toValue: 1, duration: 140, useNativeDriver: true }),
        Animated.spring(ringScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }),
      ]),
    ]).start(() => {
      setShowCheck(true);
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(contentTranslate, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    });
  }, [
    visible,
    reduceMotion,
    cardScale,
    cardOpacity,
    ringScale,
    ringOpacity,
    contentTranslate,
    contentOpacity,
  ]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onAction}>
      <View style={styles.backdrop}>
        <Animated.View
          style={[styles.card, elevation.raised, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}
        >
          <Animated.View style={[styles.iconRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}>
            {showCheck ? <CheckDraw instant={checkInstant} size={34} /> : null}
          </Animated.View>
          <Animated.View
            style={[
              styles.content,
              { opacity: contentOpacity, transform: [{ translateY: contentTranslate }] },
            ]}
          >
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            <View style={styles.actions}>
              <Button title={actionLabel} onPress={onAction} />
              {secondaryLabel && onSecondary ? (
                <Button title={secondaryLabel} onPress={onSecondary} variant="ghost" />
              ) : null}
            </View>
          </Animated.View>
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
  content: { width: '100%', alignItems: 'center', gap: spacing.xs },
  title: { fontSize: fontSize.xl, fontWeight: '900', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: fontSize.md, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxs },
  actions: { width: '100%', gap: spacing.sm, marginTop: spacing.lg },
});
