import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, fontSize, letterSpacing, elevation } from './theme';

interface BrandMarkProps {
  size?: 'lg' | 'md';
}

/** SunSea's confident, type-built mark: no image assets, just weight, color
 * and a rounded monogram tile. Used on Login and the Receipt ticket so both
 * "bookend" moments carry the same identity. */
export function BrandMark({ size = 'lg' }: BrandMarkProps) {
  const big = size === 'lg';
  return (
    <View style={styles.row}>
      <View style={[styles.tile, big ? styles.tileLg : styles.tileMd]}>
        <Text style={[styles.monogram, big ? styles.monogramLg : styles.monogramMd]}>SS</Text>
      </View>
      <View>
        <Text style={[styles.word, big ? styles.wordLg : styles.wordMd]}>
          Sun<Text style={styles.wordAccent}>Sea</Text>
        </Text>
        <Text style={[styles.sub, big ? styles.subLg : styles.subMd]}>COLLECT</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tile: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.raised,
  },
  tileLg: { width: 64, height: 64 },
  tileMd: { width: 44, height: 44, borderRadius: radius.md },
  monogram: { color: colors.onPrimary, fontWeight: '900' },
  monogramLg: { fontSize: 26, letterSpacing: -0.5 },
  monogramMd: { fontSize: 17, letterSpacing: -0.5 },
  word: { fontWeight: '900', color: colors.text, letterSpacing: letterSpacing.tightDisplay },
  wordLg: { fontSize: fontSize.xxl },
  wordMd: { fontSize: fontSize.lg },
  wordAccent: { color: colors.primary },
  sub: { fontWeight: '800', color: colors.textMuted, letterSpacing: letterSpacing.wideEyebrow, marginTop: spacing.xxs },
  subLg: { fontSize: fontSize.sm },
  subMd: { fontSize: fontSize.xs },
});
