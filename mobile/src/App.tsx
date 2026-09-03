import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import { database } from './db';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { SyncProvider } from './sync/SyncContext';
import { RootNavigator } from './navigation/RootNavigator';
import { SplashGate } from './screens/SplashGate';
import { ToastProvider } from './components/Toast';
import { AppLockGate } from './auth/AppLock';
import { sweepBrokenPromises } from './data/extras';

function Gate() {
  const { ready, isAuthenticated } = useAuth();

  // Promises to pay that lapsed without a payment are flagged when the app comes to the foreground.
  useEffect(() => {
    if (!isAuthenticated) return;
    void sweepBrokenPromises();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void sweepBrokenPromises();
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  if (!ready) return <SplashGate />;
  return (
    <SyncProvider>
      <AppLockGate>
        <RootNavigator />
      </AppLockGate>
    </SyncProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DatabaseProvider database={database}>
          <AuthProvider>
            <ToastProvider>
              <StatusBar style="dark" />
              <Gate />
            </ToastProvider>
          </AuthProvider>
        </DatabaseProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
