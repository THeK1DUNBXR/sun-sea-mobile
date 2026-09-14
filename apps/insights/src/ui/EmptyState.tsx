import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, usePalette } from './theme';

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: string;
}

export function EmptyState({ title, message, icon = '—' }: EmptyStateProps) {
  const palette = usePalette();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.icon, { color: palette.textFaint }]}>{icon}</Text>
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
  icon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
  },
});
