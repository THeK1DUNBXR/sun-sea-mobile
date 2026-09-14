import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, fontSize } from './theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}

export function Chip({ label, selected, onPress, color }: ChipProps) {
  const active = Boolean(selected);
  const tint = color ?? colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: tint },
        active ? { backgroundColor: tint } : { backgroundColor: colors.chipBg },
      ]}
    >
      <Text style={[styles.label, { color: active ? colors.onPrimary : tint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  label: { fontSize: fontSize.sm, fontWeight: '700' },
});
