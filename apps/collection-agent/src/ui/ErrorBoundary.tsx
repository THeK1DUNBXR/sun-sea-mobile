import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from './Button';
import { colors, spacing, fontSize, letterSpacing } from './theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/** Root-level crash guard: a render error anywhere below this (a bad server
 * payload shaped unlike we expected, a null we didn't chain-guard) shows a
 * plain recovery screen instead of a blank/frozen app. "Try again" remounts
 * the subtree; if the same screen keeps crashing, at least the agent isn't
 * stuck without knowing why. */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch() {
    // Intentionally no remote logging here (no crash-reporting service wired
    // up) — this app has no analytics backend to send it to. The important
    // thing is the UI recovers instead of showing a blank screen.
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={styles.wrap}>
          <View style={styles.iconWrap}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
          </View>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            SunSea Collect ran into a problem showing this screen. Your offline queue and login are safe.
          </Text>
          <Button title="Try again" onPress={this.reset} style={{ marginTop: spacing.lg }} />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.bg,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.dangerTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: fontSize.xl, fontWeight: '900', color: colors.text, letterSpacing: letterSpacing.tightDisplay, textAlign: 'center' },
  subtitle: { fontSize: fontSize.md, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
});
