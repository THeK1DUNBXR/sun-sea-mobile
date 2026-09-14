import { Redirect } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/store/auth';
import { radius, spacing, usePalette } from '@/ui/theme';

export default function LoginScreen() {
  const { login, isAuthenticated, isHydrating } = useAuth();
  const palette = usePalette();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isHydrating && isAuthenticated) {
    return <Redirect href="/(tabs)/overview" />;
  }

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
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
            <Text style={[styles.brand, { color: palette.text }]}>SunSea Insights</Text>
            <Text style={[styles.tagline, { color: palette.textMuted }]}>
              A founder's snapshot of sales, collections and field agents.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@company.com"
              placeholderTextColor={palette.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={[
                styles.input,
                { color: palette.text, borderColor: palette.border, backgroundColor: palette.card },
              ]}
            />

            <Text style={[styles.fieldLabel, { color: palette.textMuted, marginTop: spacing.md }]}>
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={palette.textFaint}
              secureTextEntry
              style={[
                styles.input,
                { color: palette.text, borderColor: palette.border, backgroundColor: palette.card },
              ]}
              onSubmitEditing={onSubmit}
            />

            {error ? (
              <Text style={[styles.error, { color: palette.bad }]}>{error}</Text>
            ) : null}

            <Pressable
              onPress={onSubmit}
              disabled={submitting}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: palette.accent, opacity: pressed || submitting ? 0.85 : 1 },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={palette.accentInk} />
              ) : (
                <Text style={[styles.buttonText, { color: palette.accentInk }]}>Sign in</Text>
              )}
            </Pressable>

            <Text style={[styles.hint, { color: palette.textFaint }]}>
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
  brand: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  tagline: { fontSize: 14, textAlign: 'center', maxWidth: 280 },
  form: { gap: spacing.xs },
  fieldLabel: { fontSize: 12.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: { fontSize: 13, fontWeight: '600', marginTop: spacing.sm },
  button: {
    marginTop: spacing.lg,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, textAlign: 'center', marginTop: spacing.md },
});
