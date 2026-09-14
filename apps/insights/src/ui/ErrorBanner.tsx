import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { errorBanner as copy } from '@/copy';
import { PressableScale } from './PressableScale';
import { MEASURE, MIN_TOUCH, radius, spacing, typography, usePalette } from './theme';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  /**
   * 'error' (default): a hard failure, nothing to show. 'stale': a refresh
   * failed but the last known data is still on screen — a caution, not a
   * failure, so it borrows the warning role instead of the danger one.
   */
  tone?: 'error' | 'stale';
}

export function ErrorBanner({ message, onRetry, tone = 'error' }: ErrorBannerProps) {
  const palette = usePalette();
  const isStale = tone === 'stale';
  const fg = isStale ? palette.warn : palette.bad;
  const bg = isStale ? palette.warnSoft : palette.badSoft;
  const border = isStale ? palette.warnBorder : palette.badBorder;
  return (
    <View
      style={[styles.wrap, { backgroundColor: bg, borderColor: border }]}
      accessibilityRole="alert"
    >
      <Text style={[styles.text, { color: fg }]}>{message}</Text>
      {onRetry ? (
        <PressableScale
          onPress={onRetry}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={copy.retry}
          style={styles.retryHit}
        >
          <Text style={[styles.retry, { color: fg }]}>{copy.retry}</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: spacing.md,
  },
  text: {
    ...typography.body,
    flex: 1,
    maxWidth: MEASURE,
  },
  retryHit: {
    minHeight: MIN_TOUCH,
    minWidth: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  retry: {
    ...typography.bodySm,
  },
});
