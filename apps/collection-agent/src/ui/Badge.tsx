import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, fontSize, letterSpacing } from './theme';
import type { Tone } from './format';

interface BadgeProps {
  label: string;
  tone?: Tone;
  /** Small filled dot ahead of the label — the consistent way this app marks
   * status everywhere (never a left-edge border stripe). */
  dot?: boolean;
}

const toneColors: Record<Tone, { bg: string; fg: string }> = {
  default: { bg: colors.chipBg, fg: colors.primaryDark },
  success: { bg: colors.successTint, fg: colors.success },
  warning: { bg: colors.warningTint, fg: colors.warning },
  danger: { bg: colors.dangerTint, fg: colors.danger },
  info: { bg: colors.infoTint, fg: colors.info },
};

export function Badge({ label, tone = 'default', dot = false }: BadgeProps) {
  const t = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]} accessibilityRole="text">
      {dot ? <View style={[styles.dot, { backgroundColor: t.fg }]} /> : null}
      <Text style={[styles.text, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: letterSpacing.wideLabel,
    textTransform: 'uppercase',
  },
});
