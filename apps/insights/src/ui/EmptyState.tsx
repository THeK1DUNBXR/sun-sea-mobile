import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { MEASURE, radius, sizes, spacing, typography, usePalette } from './theme';

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: IconName;
}

export function EmptyState({ title, message, icon = 'dash' }: EmptyStateProps) {
  const palette = usePalette();
  return (
    <View style={styles.wrap} accessibilityRole="text" accessibilityLabel={[title, message].filter(Boolean).join('. ')}>
      <View style={[styles.iconBadge, { backgroundColor: palette.overlay }]}>
        <Icon name={icon} color={palette.textFaint} size={22} strokeWidth={1.6} />
      </View>
      <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
      {message ? <Text style={[styles.message, { color: palette.textMuted }]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  iconBadge: {
    width: sizes.iconBadgeMd,
    height: sizes.iconBadgeMd,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.titleSm,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    maxWidth: MEASURE,
  },
});
