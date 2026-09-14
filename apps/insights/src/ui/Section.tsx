import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography, usePalette } from './theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, right }: SectionHeaderProps) {
  const palette = usePalette();
  return (
    <View style={styles.row} accessibilityRole="header">
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    ...typography.title,
  },
  subtitle: {
    ...typography.body,
    marginTop: 2,
  },
});
