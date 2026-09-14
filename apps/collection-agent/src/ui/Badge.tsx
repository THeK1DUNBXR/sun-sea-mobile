import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, fontSize } from './theme';

interface BadgeProps {
  label: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

const toneColors: Record<NonNullable<BadgeProps['tone']>, { bg: string; fg: string }> = {
  default: { bg: colors.chipBg, fg: colors.primaryDark },
  success: { bg: '#E4F5EC', fg: colors.success },
  warning: { bg: '#FBF0DD', fg: colors.warning },
  danger: { bg: '#FBE7E4', fg: colors.danger },
};

export function Badge({ label, tone = 'default' }: BadgeProps) {
  const t = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  text: { fontSize: fontSize.sm, fontWeight: '700' },
});
