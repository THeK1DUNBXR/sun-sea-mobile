import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { radius, spacing, usePalette } from './theme';

export function Card({ style, children, ...rest }: ViewProps) {
  const palette = usePalette();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.card, borderColor: palette.border },
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
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
});
