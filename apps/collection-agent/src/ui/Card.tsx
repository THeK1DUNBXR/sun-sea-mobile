import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing, elevation } from './theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 'raised' for a card that must stand out from its neighbors (a hero KPI,
   * an in-progress state); 'flat' opts out of elevation entirely (nested
   * content inside another card). Defaults to the standard resting elevation. */
  elevation?: 'flat' | 'resting' | 'raised';
}

export function Card({ children, style, elevation: level = 'resting' }: CardProps) {
  return <View style={[styles.card, shadowFor(level), style]}>{children}</View>;
}

function shadowFor(level: NonNullable<CardProps['elevation']>) {
  if (level === 'flat') return elevation.none;
  if (level === 'raised') return elevation.raised;
  return elevation.card;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
});
