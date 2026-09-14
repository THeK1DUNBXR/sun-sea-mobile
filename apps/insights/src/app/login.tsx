import { Redirect } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/store/auth';
import { PressableScale } from '@/ui/PressableScale';
import { MEASURE, MIN_TOUCH, radius, spacing, typography, usePalette } from '@/ui/theme';

export default function LoginScreen() {
  const { login, isAuthenticated, isHydrating, sessionMessage, dismissSessionMessage } = useAuth();
  const palette = usePalette();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  if (!isHydrating && isAuthenticated) {
    return <Redirect href="/(tabs)/overview" />;
  }

  const onSubmit = async () => {
    if (submitting) return;
    const trimmedEmail = email.trim();
    // Password is never trimmed: a leading/trailing space can be a real
    // character in a real password, and silently altering it would just
    // turn a typo into a more confusing "wrong password" error.
    if (!trimmedEmail || !password) {
      setError('Enter your email and password.');
      return;
    }
    dismissSessionMessage();
    setSubmitting(true);
    setError(null);
    try {
      await login(trimmedEmail, password);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to sign in. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandWrap}>
            <View style={[styles.logoDot, { backgroundColor: palette.accent }]} />
            <Text style={[typography.headline, { color: palette.text }]}>SunSea Insights</Text>
            <Text style={[typography.body, styles.tagline, { color: palette.textMuted }]}>
              A founder's snapshot of sales, collections and field agents.
            </Text>
          </View>

          <View style={styles.form}>
            {sessionMessage ? (
              <View style={[styles.sessionBanner, { backgroundColor: palette.warnSoft, borderColor: palette.warn + '40' }]}>
                <Text style={[typography.bodySm, { color: palette.warn }]}>{sessionMessage}</Text>
              </View>
            ) : null}

            <Text style={[typography.label, { color: palette.textMuted }]}>Email</Text>
            <TextInput
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (error) setError(null);
              }}
              placeholder="you@company.com"
              placeholderTextColor={palette.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="username"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
              editable={!submitting}
              accessibilityLabel="Email"
              style={[
                styles.input,
                { color: palette.text, borderColor: palette.border, backgroundColor: palette.card },
              ]}
            />

            <Text style={[typography.label, { color: palette.textMuted, marginTop: spacing.md }]}>
              Password
            </Text>
            <View style={styles.passwordRow}>
              <TextInput
                ref={passwordRef}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                placeholderTextColor={palette.textFaint}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                editable={!submitting}
                accessibilityLabel="Password"
                style={[
                  styles.input,
                  styles.passwordInput,
                  { color: palette.text, borderColor: palette.border, backgroundColor: palette.card },
                ]}
                onSubmitEditing={onSubmit}
              />
              <PressableScale
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
                haptic={false}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                style={styles.showPasswordButton}
              >
                <Text style={[typography.label, { color: palette.textMuted }]}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </PressableScale>
            </View>

            {error ? (
              <Text style={[typography.bodySm, { color: palette.bad, marginTop: spacing.sm }]} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}

            <PressableScale
              onPress={onSubmit}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              accessibilityState={{ disabled: submitting, busy: submitting }}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: palette.accent, opacity: pressed || submitting ? 0.85 : 1 },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={palette.accentInk} />
              ) : (
                <Text style={[typography.control, { color: palette.accentInk }]}>Sign in</Text>
              )}
            </PressableScale>

            <Text style={[typography.caption, styles.hint, { color: palette.textFaint }]} maxFontSizeMultiplier={1.6}>
              Requires the &quot;insights-app.access&quot; permission or super admin.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.xxl },
  brandWrap: { alignItems: 'center', gap: spacing.xs },
  logoDot: { width: 44, height: 44, borderRadius: 14, marginBottom: spacing.sm },
  tagline: { textAlign: 'center', maxWidth: MEASURE * 0.85 },
  form: { gap: spacing.xs },
  input: {
    ...typography.body,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  passwordRow: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 64 },
  showPasswordButton: {
    position: 'absolute',
    right: spacing.sm,
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionBanner: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  button: {
    marginTop: spacing.lg,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  hint: { textAlign: 'center', marginTop: spacing.md },
});
