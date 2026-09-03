import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import { database } from './db';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { SyncProvider } from './sync/SyncContext';
import { RootNavigator } from './navigation/RootNavigator';
import { SplashGate } from './screens/SplashGate';

function Gate() {
  const { ready } = useAuth();
  if (!ready) return <SplashGate />;
  return (
    <SyncProvider>
      <RootNavigator />
    </SyncProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DatabaseProvider database={database}>
          <AuthProvider>
            <StatusBar style="dark" />
            <Gate />
          </AuthProvider>
        </DatabaseProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
