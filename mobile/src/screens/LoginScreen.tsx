import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { Button, Field, Notice } from '../components/ui';
import { colors, radius, spacing, type } from '../theme';
import { APP_VERSION } from '../config';
import type { ScreenProps } from '../navigation/types';
import { ApiError } from '../api/client';

export function LoginScreen({ navigation }: ScreenProps<'Login'>) {
  const { login, enterDemo, sessionExpired, agent } = useAuth();
  const [demoBusy, setDemoBusy] = useState(false);
  const [username, setUsername] = useState(agent?.email ?? '');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!username.trim() || !password) {
      setError('Enter your username and password');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
    } catch (e) {
      const err = e as ApiError;
      setError(err.isOffline ? 'You are offline. Connect to the internet to sign in.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.card }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}>
            <Ionicons name="sunny" size={44} color={colors.warning} />
            <Text style={[type.h1, { color: colors.primary, marginTop: 8 }]}>SUN SEA ERP</Text>
            <Text style={type.small}>Sales Executive App</Text>
          </View>

          {sessionExpired ? <Notice tone="warning" text="Your session has expired. Sign in again to continue syncing — your offline entries are safe." /> : null}
          {error ? <Notice tone="danger" text={error} /> : null}

          <Field label="Username or email" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="agent@sunsea.in" />
          <View style={{ position: 'relative' }}>
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry={!showPw} placeholder="••••••••" onSubmitEditing={submit} returnKeyType="go" />
            <Pressable onPress={() => setShowPw((s) => !s)} style={styles.eye} hitSlop={8}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
            </Pressable>
          </View>
          <Button title="Login" onPress={submit} loading={busy} />

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={type.tiny}>PROTOTYPE</Text>
            <View style={styles.orLine} />
          </View>
          <Button
            title="Explore the demo (no server needed)"
            variant="outline"
            icon="play-circle-outline"
            loading={demoBusy}
            onPress={async () => {
              setDemoBusy(true);
              try {
                await enterDemo();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setDemoBusy(false);
              }
            }}
          />
          <Text style={[type.tiny, { textAlign: 'center', marginTop: 8 }]}>Loads sample customers, invoices, a route plan and products on this device. Nothing is sent anywhere.</Text>

          <Pressable onPress={() => navigation.navigate('Settings' as never)} style={{ marginTop: spacing.xl, alignSelf: 'center' }}>
            <Text style={[type.small, { color: colors.primary }]}>Server settings</Text>
          </Pressable>
          <Text style={[type.tiny, { textAlign: 'center', marginTop: spacing.xxl }]}>Version {APP_VERSION}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  logo: { alignItems: 'center', marginBottom: spacing.xxl },
  eye: { position: 'absolute', right: 12, top: 36, padding: 4, borderRadius: radius.sm },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: spacing.xl },
  orLine: { flex: 1, height: 1, backgroundColor: colors.line },
});
