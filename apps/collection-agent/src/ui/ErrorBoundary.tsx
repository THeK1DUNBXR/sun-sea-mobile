import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from './Button';
import { colors, spacing, type } from './theme';
import { copy } from '@/copy';

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
          <Text style={styles.title}>{copy.errorBoundary.title}</Text>
          <Text style={styles.subtitle}>{copy.errorBoundary.subtitle}</Text>
          <Button title={copy.errorBoundary.tryAgain} onPress={this.reset} style={{ marginTop: spacing.lg }} />
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
  title: { ...type.headline, color: colors.text, textAlign: 'center' },
  subtitle: { ...type.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
});
