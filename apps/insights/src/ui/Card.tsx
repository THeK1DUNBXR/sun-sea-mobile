import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { radius, spacing, useElevation, useIsDark, usePalette } from './theme';

interface CardProps extends ViewProps {
  /** 'raised' gives a stronger lift for the surface's most important block (e.g. the map, the hero chart). */
  elevation?: 'card' | 'raised' | 'flat';
}

export function Card({ style, children, elevation = 'card', ...rest }: CardProps) {
  const palette = usePalette();
  const dark = useIsDark();
  const shadow = useElevation(elevation);
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
          borderWidth: dark ? StyleSheet.hairlineWidth : elevation === 'flat' ? StyleSheet.hairlineWidth : 0,
        },
        shadow,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
});
