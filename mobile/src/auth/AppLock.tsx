import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, type } from '../theme';
import { useAuth } from './AuthContext';

export const APP_LOCK_KEY = 'sunsea.appLock';
const RELOCK_AFTER_MS = 60 * 1000;

export async function isAppLockEnabled() {
  try {
    return (await AsyncStorage.getItem(APP_LOCK_KEY)) === '1';
  } catch {
    return false;
  }
}
export async function setAppLockEnabled(on: boolean) {
  await AsyncStorage.setItem(APP_LOCK_KEY, on ? '1' : '0');
}
export async function deviceSupportsLock() {
  const hw = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return hw && enrolled;
}

/**
 * Asks for the device's biometric / PIN when the app is opened or returns from
 * the background after a minute, if the agent enabled it in Settings. The
 * device carries cash and customer balances, so this is on by request.
 */
export function AppLockGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const backgroundedAt = useRef<number | null>(null);

  const unlock = useCallback(async () => {
    setBusy(true);
    try {
      const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Sun Sea Field', cancelLabel: 'Cancel', disableDeviceFallback: false });
      if (res.success) setLocked(false);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      if ((await isAppLockEnabled()) && (await deviceSupportsLock())) {
        setLocked(true);
        void unlock();
      }
    })();
    const sub = AppState.addEventListener('change', async (s) => {
      if (s === 'background' || s === 'inactive') {
        backgroundedAt.current = backgroundedAt.current ?? Date.now();
      } else if (s === 'active') {
        const away = backgroundedAt.current ? Date.now() - backgroundedAt.current : 0;
        backgroundedAt.current = null;
        if (away > RELOCK_AFTER_MS && (await isAppLockEnabled()) && (await deviceSupportsLock())) {
          setLocked(true);
          void unlock();
        }
      }
    });
    return () => sub.remove();
  }, [isAuthenticated, unlock]);

  if (!locked) return <>{children}</>;
  return (
    <View style={styles.wrap}>
      <Ionicons name="lock-closed" size={48} color="#fff" />
      <Text style={[type.h2, { color: '#fff', marginTop: spacing.md }]}>Sun Sea Field is locked</Text>
      <Text style={{ color: '#CBD5E1', marginTop: 4, textAlign: 'center' }}>Unlock with your fingerprint, face or device PIN.</Text>
      <Pressable onPress={unlock} disabled={busy} style={styles.btn}>
        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>{busy ? 'Unlocking…' : 'Unlock'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  btn: { marginTop: spacing.xl, backgroundColor: '#fff', paddingHorizontal: 28, minHeight: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
