import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { PressableScale } from '@/ui/PressableScale';
import { Screen } from '@/ui/Screen';
import { BrandMark } from '@/ui/BrandMark';
import { colors, spacing, type, radius, letterSpacing } from '@/ui/theme';
import { getServerHostLabel, getServerUrl, hydrateServerUrl } from '@/api/serverUrl';
import { useAuth } from '@/store/auth';
import { copy } from '@/copy';

export default function LoginScreen() {
  const router = useRouter();
  const { login, enterDemo, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [serverHost, setServerHost] = useState(getServerHostLabel(getServerUrl()));

  useFocusEffect(
    useCallback(() => {
      hydrateServerUrl().then((url) => setServerHost(getServerHostLabel(url)));
    }, []),
  );

  const onSubmit = async () => {
    setFormError(null);
    clearError();
    if (!email.trim() || !password) {
      setFormError(copy.login.missingFields);
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? err?.message ?? copy.login.genericFailure);
    } finally {
      setSubmitting(false);
    }
  };

  const onExploreDemo = async () => {
    if (demoBusy) return;
    setFormError(null);
    clearError();
    setDemoBusy(true);
    try {
      await enterDemo();
    } finally {
      setDemoBusy(false);
    }
  };

  const activeError = formError ?? error;

  return (
    <Screen scroll={false} avoidKeyboard style={styles.screen}>
      <View style={styles.center}>
        <View style={styles.logoWrap}>
          <BrandMark size="lg" />
          <Text style={styles.tagline}>{copy.login.tagline}</Text>
        </View>

        <View style={styles.form}>
          <Input
            label={copy.login.emailLabel}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@sunsea.com"
            returnKeyType="next"
          />
          <Input
            label={copy.login.passwordLabel}
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />
          {activeError ? (
            <View style={styles.errorBox} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.error}>{activeError}</Text>
            </View>
          ) : null}
          <Button title={copy.login.logIn} onPress={onSubmit} loading={submitting} style={{ marginTop: spacing.sm }} />
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{copy.login.orDivider}</Text>
          <View style={styles.dividerLine} />
        </View>
        <Button
          title={copy.login.exploreDemo}
          onPress={onExploreDemo}
          loading={demoBusy}
          variant="secondary"
          icon={<Ionicons name="play-circle-outline" size={18} color={colors.primary} />}
        />
        <Text style={styles.demoHint}>{copy.login.exploreDemoHint}</Text>

        <PressableScale
          onPress={() => router.push('/server')}
          accessibilityRole="button"
          accessibilityLabel={copy.login.serverLinkA11y}
          style={styles.serverLink}
        >
          <Ionicons name="server-outline" size={14} color={colors.textMuted} />
          <Text style={styles.serverLinkText}>{copy.login.serverLink(serverHost)}</Text>
        </PressableScale>
      </View>
      <Text style={styles.footer}>{copy.login.footer}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  logoWrap: { alignItems: 'flex-start', marginBottom: spacing.xxxl },
  tagline: {
    ...type.body,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  form: { gap: spacing.sm },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...type.caption, color: colors.textFaint },
  demoHint: { ...type.caption, color: colors.textFaint, textAlign: 'center', marginTop: spacing.sm },
  serverLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    minHeight: 44,
  },
  serverLinkText: { ...type.caption, color: colors.textMuted },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerTint,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  error: { ...type.body, color: colors.danger, flex: 1 },
  footer: {
    ...type.caption,
    textAlign: 'center',
    color: colors.textFaint,
    letterSpacing: letterSpacing.wideLabel,
    paddingBottom: spacing.lg,
    textTransform: 'uppercase',
  },
});
