import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { errors as errorCopy, serverScreen as copy } from '@/copy';
import { useAuth } from '@/store/auth';
import { Card } from '@/ui/Card';
import { ErrorBanner } from '@/ui/ErrorBanner';
import { Icon } from '@/ui/Icon';
import { PressableScale } from '@/ui/PressableScale';
import { layout, MIN_TOUCH, radius, spacing, typography, usePalette } from '@/ui/theme';

export default function ServerScreen() {
  const palette = usePalette();
  const router = useRouter();
  const { isAuthenticated, signOutForServerChange } = useAuth();

  const [input, setInput] = useState(getServerUrl());
  const [current, setCurrent] = useState(getServerUrl());
  // Guards against a background hydrate (still resolving from the very first
  // cold-start read) clobbering text the founder has already started typing.
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

  // Coming back from a save elsewhere (there isn't one today, but this keeps
  // the "Current server" line honest if that ever changes) or on first focus.
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
      } else {
        router.back();
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
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Card style={{ gap: spacing.xs }}>
              <Text style={[typography.label, { color: palette.textMuted }]}>{copy.currentLabel}</Text>
              <Text
                style={[typography.body, { color: palette.text }]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.6}
              >
                {current}
              </Text>
            </Card>

            <Text style={[typography.label, { color: palette.textMuted, marginTop: spacing.xl }]}>
              {copy.inputLabel}
            </Text>
            <TextInput
              value={input}
              onChangeText={onChangeInput}
              placeholder={copy.inputPlaceholder}
              placeholderTextColor={palette.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              accessibilityLabel={copy.inputA11y}
              style={[
                styles.input,
                { color: palette.text, borderColor: palette.border, backgroundColor: palette.card },
              ]}
            />
            {!isValid && trimmed.length > 0 ? (
              <Text
                style={[typography.bodySm, { color: palette.bad, marginTop: spacing.xs }]}
                accessibilityRole="alert"
              >
                {reason}
              </Text>
            ) : null}

            <View style={[styles.helperBox, { backgroundColor: palette.overlay }]}>
              <Text style={[typography.label, { color: palette.textMuted }]}>{copy.helperTitle}</Text>
              <Text style={[typography.bodySm, styles.helperLine, { color: palette.textMuted }]}>
                {copy.helperAndroidEmulator}
              </Text>
              <Text style={[typography.bodySm, styles.helperLine, { color: palette.textMuted }]}>
                {copy.helperLanPhone}
              </Text>
              <Text style={[typography.bodySm, styles.helperLine, { color: palette.textMuted }]}>
                {copy.helperHosted}
              </Text>
            </View>

            <PressableScale
              onPress={onTest}
              disabled={!isValid || testing}
              haptic={false}
              accessibilityRole="button"
              accessibilityLabel={testing ? copy.testingButton : copy.testButtonA11y}
              accessibilityState={{ disabled: !isValid || testing, busy: testing }}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  borderColor: palette.border,
                  opacity: !isValid ? 0.5 : Platform.OS === 'ios' && pressed ? 0.7 : 1,
                },
              ]}
            >
              {testing ? (
                <ActivityIndicator color={palette.text} />
              ) : (
                <Text style={[typography.control, { color: palette.text }]}>{copy.testButton}</Text>
              )}
            </PressableScale>

            {testResult ? (
              testResult.ok ? (
                <View
                  style={[styles.resultBox, { backgroundColor: palette.goodSoft, borderColor: palette.good }]}
                  accessibilityRole="text"
                  accessibilityLabel={copy.test.successA11y(
                    testResult.version ?? '—',
                    testResult.environment ?? '—',
                    testResult.latencyMs
                  )}
                >
                  <Icon name="check" color={palette.good} size={18} />
                  <Text style={[typography.bodySm, { color: palette.good, flex: 1 }]}>
                    {copy.test.success(testResult.version ?? '—', testResult.environment ?? '—', testResult.latencyMs)}
                  </Text>
                </View>
              ) : (
                <ErrorBanner message={testResult.error ?? errorCopy.generic} onRetry={onTest} />
              )
            ) : null}

            {willSignOut ? (
              <Text style={[typography.bodySm, styles.note, { color: palette.warn }]}>{copy.changeNote}</Text>
            ) : null}

            <PressableScale
              onPress={onSave}
              disabled={!isValid || saving}
              accessibilityRole="button"
              accessibilityLabel={saving ? copy.savingButton : copy.saveButtonA11y}
              accessibilityState={{ disabled: !isValid || saving, busy: saving }}
              rippleColor="rgba(255,255,255,0.25)"
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: palette.accent,
                  opacity: !isValid ? 0.5 : saving ? 0.85 : Platform.OS === 'ios' && pressed ? 0.85 : 1,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator color={palette.accentInk} />
              ) : (
                <Text style={[typography.control, { color: palette.accentInk }]}>{copy.saveButton}</Text>
              )}
            </PressableScale>

            <PressableScale
              onPress={onReset}
              haptic={false}
              accessibilityRole="button"
              accessibilityLabel={copy.resetButtonA11y}
              style={styles.resetButton}
            >
              <Text style={[typography.bodySm, { color: palette.textMuted }]}>{copy.resetButton}</Text>
            </PressableScale>

            <View style={{ height: layout.scrollEndSpacer }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: layout.screenGutter },
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
  input: {
    ...typography.body,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  helperBox: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: 2,
  },
  helperLine: { marginTop: 2 },
  secondaryButton: {
    marginTop: spacing.lg,
    minHeight: MIN_TOUCH,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  note: { marginTop: spacing.md },
  primaryButton: {
    marginTop: spacing.xl,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  resetButton: {
    marginTop: spacing.md,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
