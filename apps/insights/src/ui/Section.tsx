import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, usePalette } from './theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, right }: SectionHeaderProps) {
  const palette = usePalette();
  return (
    <View style={styles.row}>
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
    marginTop: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});
