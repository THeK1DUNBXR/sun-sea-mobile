import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Screen } from '@/ui/Screen';
import { colors, spacing, fontSize } from '@/ui/theme';
import { useAuth } from '@/store/auth';

export default function LoginScreen() {
  const { login, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = async () => {
    setFormError(null);
    clearError();
    if (!email.trim() || !password) {
      setFormError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? err?.message ?? 'Login failed. Check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll={false} style={styles.screen}>
      <View style={styles.center}>
        <View style={styles.logoWrap}>
          <Text style={styles.logo}>SunSea Collect</Text>
          <Text style={styles.tagline}>Field collection for SunSea agents</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@sunsea.com"
          />
          <Input
            label="Password"
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
          />
          {(formError || error) && <Text style={styles.error}>{formError ?? error}</Text>}
          <Button title="Log in" onPress={onSubmit} loading={submitting} style={{ marginTop: spacing.sm }} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  logoWrap: { alignItems: 'center', marginBottom: spacing.xxl },
  logo: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.primaryDark },
  tagline: { fontSize: fontSize.md, color: colors.textMuted, marginTop: spacing.xs },
  form: { gap: spacing.sm },
  error: { color: colors.danger, fontSize: fontSize.md, textAlign: 'center' },
});
