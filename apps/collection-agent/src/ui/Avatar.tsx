import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from './theme';

interface AvatarProps {
  label: string;
  color: string;
  size?: number;
}

/** A colored initials mark used to carry the priority/status signal on scan
 * lists — replaces a left-edge border stripe with something that reads at a
 * glance and doubles as the customer identity mark. */
export function Avatar({ label, color, size = 44 }: AvatarProps) {
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      <Text style={[styles.label, { fontSize: size * 0.36 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.onPrimary, fontWeight: '900', letterSpacing: -0.2 },
});
