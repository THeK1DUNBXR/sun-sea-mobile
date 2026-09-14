import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from './PressableScale';
import { MEASURE, MIN_TOUCH, radius, spacing, typography, usePalette } from './theme';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  const palette = usePalette();
  return (
    <View
      style={[styles.wrap, { backgroundColor: palette.badSoft, borderColor: palette.bad + '40' }]}
      accessibilityRole="alert"
    >
      <Text style={[styles.text, { color: palette.bad }]}>{message}</Text>
      {onRetry ? (
        <PressableScale
          onPress={onRetry}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Retry"
          style={styles.retryHit}
        >
          <Text style={[styles.retry, { color: palette.bad }]}>Retry</Text>
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
