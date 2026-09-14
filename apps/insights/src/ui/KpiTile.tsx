import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { formatMoneyCompact, formatMoneyCompactSpoken, formatPercent } from '@/utils/format';
import { AnimatedNumber } from './AnimatedNumber';
import { Card } from './Card';
import { radius, spacing, tabularNums, typography, useReducedMotion, usePalette } from './theme';

interface KpiTileProps {
  label: string;
  value: string;
  /** Raw amount backing `value`; when finite, the figure counts up on mount and rolls on change. */
  numericValue?: number | null;
  deltaPct?: number | null;
  deltaLabel?: string;
  /** Invert semantics for metrics where a rise is bad (e.g. overdue). */
  invertColor?: boolean;
  caption?: string;
  /** Overrides the caption's default (textFaint) color — e.g. the neutral
   * "awaiting action" tone for a pending-verification tile. The caption text
   * itself always carries the meaning; this only adds a quiet color cue. */
  captionColor?: string;
  /**
   * 'hero' dominates the top of the screen with a much larger figure.
   * 'wide' spans a full row like hero, but at grid-tile emphasis — for a
   * single metric that doesn't pair evenly with the others (so it reads as
   * a deliberate callout, not a stray tile stretched to fill its row).
   */
  variant?: 'default' | 'hero' | 'wide';
  accessibilityHint?: string;
}

export function KpiTile({
  label,
  value,
  numericValue,
  deltaPct,
  deltaLabel,
  invertColor,
  caption,
  captionColor,
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
  const isWide = variant === 'wide';
  const reducedMotion = useReducedMotion();

  // Screen readers get the spelled-out rupee value ("₹4.82 lakh") instead of
  // the visible compact glyph ("₹4.82L") — "L"/"Cr" read as letters, not
  // units, to VoiceOver/TalkBack.
  const a11yValue = numericValue !== undefined ? formatMoneyCompactSpoken(numericValue) : value;
  const a11yLabel = [
    label,
    a11yValue,
    hasDelta ? `${arrow === '▲' ? 'up' : 'down'} ${formatPercent(Math.abs(deltaPct!)).replace('+', '').replace('%', '')} percent${deltaLabel ? ` ${deltaLabel}` : ''}` : null,
    caption,
  ]
    .filter(Boolean)
    .join(', ');

  const footer =
    hasDelta || caption ? (
      <View style={[styles.footerRow, isWide && styles.footerRowWide]}>
        {hasDelta ? (
          <Animated.View
            entering={reducedMotion ? FadeIn.duration(180) : FadeInDown.duration(220).springify().damping(18)}
            style={[styles.deltaPill, { backgroundColor: deltaSoft }]}
          >
            <Text style={[typography.monoSm, { color: deltaColor }]} maxFontSizeMultiplier={1.6}>
              {arrow} {formatPercent(Math.abs(deltaPct!)).replace('+', '')}
            </Text>
          </Animated.View>
        ) : null}
        {hasDelta && deltaLabel ? (
          <Text
            style={[typography.caption, { color: palette.textFaint }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.6}
          >
            {deltaLabel}
          </Text>
        ) : null}
        {caption ? (
          <Text
            style={[typography.caption, isWide && styles.wideCaption, { color: captionColor ?? palette.textFaint }]}
            numberOfLines={isWide ? 2 : 1}
            maxFontSizeMultiplier={1.6}
          >
            {caption}
          </Text>
        ) : null}
      </View>
    ) : null;

  const heading = (
    <>
      <Text
        style={[typography.label, { color: palette.textMuted }]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.8}
      >
        {label}
      </Text>
      <AnimatedNumber
        value={numericValue ?? null}
        format={(v) => formatMoneyCompact(v)}
        fallback={value}
        style={[
          isHero ? typography.display : isWide ? typography.statCompact : typography.stat,
          tabularNums,
          { color: palette.text, marginTop: isWide ? 4 : 6 },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.6}
        duration={isHero ? 800 : 650}
      />
    </>
  );

  return (
    <Card
      style={[styles.tile, isHero && styles.tileHero, isWide && styles.tileWide]}
      elevation={isHero ? 'raised' : 'card'}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={a11yLabel}
      accessibilityHint={accessibilityHint}
    >
      {isWide ? (
        <View style={styles.wideRow}>
          <View style={{ flex: 1 }}>{heading}</View>
          {footer}
        </View>
      ) : (
        <>
          {heading}
          {footer}
        </>
      )}
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
    // A giant number needs more air around it than a small stat tile, or the
    // proportion between figure and card reads cramped instead of confident.
    paddingVertical: spacing.xl,
  },
  tileWide: {
    flexBasis: '100%',
    minWidth: '100%',
  },
  wideRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  footerRowWide: {
    flexShrink: 0,
    justifyContent: 'flex-end',
    marginTop: 0,
    marginBottom: 2,
  },
  wideCaption: {
    textAlign: 'right',
    maxWidth: 160,
  },
  deltaPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
});
