import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import {
  DEFAULT_SERVER_URL,
  getServerUrl,
  hydrateServerUrl,
  normalizeServerUrl,
  setServerUrl,
  testServerConnection,
  validateServerUrl,
  type ServerTestResult,
} from '@/api/serverUrl';
import { useAuth } from '@/store/auth';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Input } from '@/ui/Input';
import { Screen } from '@/ui/Screen';
import { colors, radius, spacing, type } from '@/ui/theme';
import { copy } from '@/copy';

export default function ServerScreen() {
  const router = useRouter();
  const { isAuthenticated, signOutForServerChange } = useAuth();

  const [input, setInput] = useState(getServerUrl());
  const [current, setCurrent] = useState(getServerUrl());
  // Guards against a background hydrate (still resolving from the very first
  // cold-start read) clobbering text the agent has already started typing.
  const touchedRef = useRef(false);

  const refreshFromStore = useCallback(() => {
    hydrateServerUrl().then((url) => {
      setCurrent(url);
      if (!touchedRef.current) setInput(url);
    });
  }, []);

  useEffect(() => {
    refreshFromStore();
  }, [refreshFromStore]);

  useFocusEffect(refreshFromStore);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ServerTestResult | null>(null);
  const [saving, setSaving] = useState(false);

  const trimmed = input.trim();
  const reason = validateServerUrl(trimmed);
  const isValid = reason === null;
  const normalized = isValid ? normalizeServerUrl(trimmed) : null;
  const willSignOut = isAuthenticated && normalized !== null && normalized !== current;

  const onChangeInput = (text: string) => {
    touchedRef.current = true;
    setInput(text);
    setTestResult(null);
  };

  const onTest = useCallback(async () => {
    if (!normalized || testing) return;
    setTesting(true);
    setTestResult(null);
    const result = await testServerConnection(normalized);
    setTestResult(result);
    setTesting(false);
  }, [normalized, testing]);

  const onSave = async () => {
    if (!normalized || saving) return;
    setSaving(true);
    try {
      const changed = normalized !== current;
      await setServerUrl(normalized);
      if (changed && isAuthenticated) {
        await signOutForServerChange();
        router.replace('/login');
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/login');
      }
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    touchedRef.current = true;
    setInput(DEFAULT_SERVER_URL);
    setTestResult(null);
  };

  return (
    <Screen avoidKeyboard>
      <Card style={styles.currentCard}>
        <Text style={styles.label}>{copy.server.currentLabel}</Text>
        <Text style={styles.currentValue} numberOfLines={1} maxFontSizeMultiplier={1.6}>
          {current}
        </Text>
      </Card>

      <View>
        <Input
          label={copy.server.inputLabel}
          value={input}
          onChangeText={onChangeInput}
          placeholder={copy.server.inputPlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          accessibilityLabel={copy.server.inputA11y}
          error={!isValid && trimmed.length > 0 ? reason : null}
        />
      </View>

      <View style={styles.helperBox}>
        <Text style={styles.label}>{copy.server.helperTitle}</Text>
        <Text style={styles.helperLine}>{copy.server.helperAndroidEmulator}</Text>
        <Text style={styles.helperLine}>{copy.server.helperLanPhone}</Text>
        <Text style={styles.helperLine}>{copy.server.helperHosted}</Text>
      </View>

      <Button
        title={testing ? copy.server.testingButton : copy.server.testButton}
        onPress={onTest}
        disabled={!isValid}
        loading={testing}
        variant="secondary"
        accessibilityLabel={testing ? copy.server.testingButton : copy.server.testButtonA11y}
      />

      {testResult ? (
        testResult.ok ? (
          <View
            style={styles.resultBoxGood}
            accessibilityRole="text"
            accessibilityLabel={copy.server.test.successA11y(
              testResult.version ?? '—',
              testResult.environment ?? '—',
              testResult.latencyMs,
            )}
          >
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.resultTextGood}>
              {copy.server.test.success(testResult.version ?? '—', testResult.environment ?? '—', testResult.latencyMs)}
            </Text>
          </View>
        ) : (
          <View style={styles.resultBoxBad} accessibilityRole="alert">
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.resultTextBad}>{testResult.error}</Text>
          </View>
        )
      ) : null}

      {willSignOut ? (
        <View style={styles.noteRow}>
          <Ionicons name="warning-outline" size={16} color={colors.warning} />
          <Text style={styles.noteText}>{copy.server.changeNote}</Text>
        </View>
      ) : null}

      <Button
        title={saving ? copy.server.savingButton : copy.server.saveButton}
        onPress={onSave}
        disabled={!isValid}
        loading={saving}
        accessibilityLabel={saving ? copy.server.savingButton : copy.server.saveButtonA11y}
      />

      <Button
        title={copy.server.resetButton}
        onPress={onReset}
        variant="ghost"
        accessibilityLabel={copy.server.resetButtonA11y}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  currentCard: { gap: spacing.xxs },
  label: { ...type.label, color: colors.textMuted },
  currentValue: { ...type.body, color: colors.text },
  helperBox: {
    backgroundColor: colors.bgAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  helperLine: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  resultBoxGood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successTint,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  resultTextGood: { ...type.body, color: colors.success, flex: 1 },
  resultBoxBad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerTint,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  resultTextBad: { ...type.body, color: colors.danger, flex: 1 },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warningTint,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  noteText: { ...type.body, color: colors.text, flex: 1 },
});
