import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatPercent } from '@/utils/format';
import { Card } from './Card';
import { spacing, typography, usePalette } from './theme';

interface KpiTileProps {
  label: string;
  value: string;
  deltaPct?: number | null;
  deltaLabel?: string;
  /** Invert semantics for metrics where a rise is bad (e.g. overdue). */
  invertColor?: boolean;
  caption?: string;
  /** Hero tiles dominate the top of the screen with a larger, wider treatment. */
  variant?: 'default' | 'hero';
  accessibilityHint?: string;
}

export function KpiTile({
  label,
  value,
  deltaPct,
  deltaLabel,
  invertColor,
  caption,
  variant = 'default',
  accessibilityHint,
}: KpiTileProps) {
  const palette = usePalette();
  const hasDelta = deltaPct !== undefined && deltaPct !== null && !Number.isNaN(deltaPct);
  const isGood = hasDelta ? (invertColor ? deltaPct! < 0 : deltaPct! >= 0) : null;
  const deltaColor = isGood === null ? palette.textFaint : isGood ? palette.good : palette.bad;
  const deltaSoft = isGood === null ? palette.overlay : isGood ? palette.goodSoft : palette.badSoft;
  const arrow = hasDelta ? (deltaPct! >= 0 ? '▲' : '▼') : '';
  const isHero = variant === 'hero';

  const a11yLabel = [
    label,
    value,
    hasDelta ? `${arrow === '▲' ? 'up' : 'down'} ${formatPercent(Math.abs(deltaPct!)).replace('+', '').replace('%', '')} percent${deltaLabel ? ` ${deltaLabel}` : ''}` : null,
    caption,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Card
      style={[styles.tile, isHero && styles.tileHero]}
      elevation={isHero ? 'raised' : 'card'}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={a11yLabel}
      accessibilityHint={accessibilityHint}
    >
      <Text style={[styles.label, typography.label, { color: palette.textMuted }]} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[isHero ? typography.hero : typography.statLg, { color: palette.text, marginTop: 6 }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      {hasDelta || caption ? (
        <View style={styles.footerRow}>
          {hasDelta ? (
            <View style={[styles.deltaPill, { backgroundColor: deltaSoft }]}>
              <Text style={[styles.delta, { color: deltaColor }]}>
                {arrow} {formatPercent(Math.abs(deltaPct!)).replace('+', '')}
              </Text>
            </View>
          ) : null}
          {hasDelta && deltaLabel ? (
            <Text style={[styles.deltaLabel, { color: palette.textFaint }]} numberOfLines={1}>
              {deltaLabel}
            </Text>
          ) : null}
          {caption ? (
            <Text style={[styles.caption, { color: palette.textFaint }]} numberOfLines={1}>
              {caption}
            </Text>
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
  },
  tileHero: {
    flexBasis: '100%',
    minWidth: '100%',
  },
  label: {
    textTransform: 'uppercase',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  deltaPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  delta: {
    fontSize: 12.5,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  deltaLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    fontWeight: '600',
  },
});
