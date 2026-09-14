import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from './PressableScale';
import { MEASURE, MIN_TOUCH, radius, sizes, spacing, typography, usePalette, type Palette } from './theme';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Root-level crash guard. A rendering error anywhere below this (a bad chart
 * measurement, an unexpected null in a response we didn't fully anticipate,
 * a third-party native module throwing) would otherwise take down the whole
 * app to a blank screen or the RN redbox in production. This turns it into a
 * recoverable screen instead — "Try again" just remounts the tree, since most
 * of these crashes are triggered by one bad in-memory query cache entry that
 * a fresh render (and, if it recurs, a fresh fetch) clears.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // No crash-reporting service wired up in this app; at minimum, don't
    // swallow it silently in development.
    if (__DEV__) {
      console.error('[ErrorBoundary] caught render error:', error, info.componentStack);
    }
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return <ErrorFallback onRetry={this.reset} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const palette = usePalette();
  const styles = getStyles(palette);
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeGlyph} maxFontSizeMultiplier={1.4}>
            !
          </Text>
        </View>
        <Text style={styles.title} maxFontSizeMultiplier={1.8}>
          Something went wrong
        </Text>
        <Text style={styles.message} maxFontSizeMultiplier={1.8}>
          Insights hit an unexpected problem. Your data is safe — try again, and if it keeps
          happening, reopen the app.
        </Text>
        <PressableScale
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          style={styles.button}
        >
          <Text style={styles.buttonText}>Try again</Text>
        </PressableScale>
      </View>
    </SafeAreaView>
  );
}

function getStyles(palette: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.bg },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.sm,
    },
    badge: {
      width: sizes.avatarMd,
      height: sizes.avatarMd,
      borderRadius: sizes.avatarMd / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.badSoft,
      marginBottom: spacing.md,
    },
    badgeGlyph: { ...typography.stat, color: palette.bad },
    title: { ...typography.headline, color: palette.text, textAlign: 'center' },
    message: {
      ...typography.body,
      color: palette.textMuted,
      textAlign: 'center',
      maxWidth: MEASURE,
    },
    button: {
      marginTop: spacing.lg,
      minHeight: MIN_TOUCH,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      backgroundColor: palette.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: { ...typography.control, color: palette.accentInk },
  });
}
