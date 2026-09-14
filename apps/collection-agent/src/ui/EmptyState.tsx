import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, type, sizes } from './theme';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'neutral' | 'offline' | 'success';
}

const toneColor: Record<NonNullable<EmptyStateProps['tone']>, string> = {
  neutral: colors.neutral,
  offline: colors.warning,
  success: colors.success,
};

const toneBg: Record<NonNullable<EmptyStateProps['tone']>, string> = {
  neutral: colors.neutralTint,
  offline: colors.warningTint,
  success: colors.successTint,
};

export function EmptyState({ title, subtitle, icon = 'file-tray-outline', tone = 'neutral' }: EmptyStateProps) {
  return (
    <View style={styles.wrap} accessibilityRole="text">
      <View style={[styles.iconWrap, { backgroundColor: toneBg[tone] }]}>
        <Ionicons name={icon} size={28} color={toneColor[tone]} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.sm },
  iconWrap: {
    width: sizes.emptyStateIcon,
    height: sizes.emptyStateIcon,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: { ...type.title, color: colors.text, textAlign: 'center' },
  subtitle: { ...type.body, color: colors.textMuted, textAlign: 'center' },
});
