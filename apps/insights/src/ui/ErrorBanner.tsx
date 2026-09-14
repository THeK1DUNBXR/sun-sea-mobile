import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, usePalette } from './theme';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  const palette = usePalette();
  return (
    <View style={[styles.wrap, { backgroundColor: palette.bad + '18', borderColor: palette.bad + '40' }]}>
      <Text style={[styles.text, { color: palette.bad }]}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={8}>
          <Text style={[styles.retry, { color: palette.bad }]}>Retry</Text>
        </Pressable>
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
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  retry: {
    fontSize: 13,
    fontWeight: '800',
  },
});
