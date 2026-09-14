import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatPercent } from '@/utils/format';
import { Card } from './Card';
import { spacing, usePalette } from './theme';

interface KpiTileProps {
  label: string;
  value: string;
  deltaPct?: number | null;
  deltaLabel?: string;
  /** Invert semantics for metrics where a rise is bad (e.g. overdue). */
  invertColor?: boolean;
  caption?: string;
}

export function KpiTile({ label, value, deltaPct, deltaLabel, invertColor, caption }: KpiTileProps) {
  const palette = usePalette();
  const hasDelta = deltaPct !== undefined && deltaPct !== null && !Number.isNaN(deltaPct);
  const isGood = hasDelta ? (invertColor ? deltaPct! < 0 : deltaPct! >= 0) : null;
  const deltaColor = isGood === null ? palette.textFaint : isGood ? palette.good : palette.bad;
  const arrow = hasDelta ? (deltaPct! >= 0 ? '▲' : '▼') : '';

  return (
    <Card style={styles.tile}>
      <Text style={[styles.label, { color: palette.textMuted }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, { color: palette.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {hasDelta || caption ? (
        <View style={styles.footerRow}>
          {hasDelta ? (
            <Text style={[styles.delta, { color: deltaColor }]}>
              {arrow} {formatPercent(Math.abs(deltaPct!)).replace('+', '')}
              {deltaLabel ? ` ${deltaLabel}` : ''}
            </Text>
          ) : null}
          {caption ? (
            <Text style={[styles.caption, { color: palette.textFaint }]}>{caption}</Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 150,
    gap: spacing.xs,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  delta: {
    fontSize: 12.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  caption: {
    fontSize: 12,
  },
});
