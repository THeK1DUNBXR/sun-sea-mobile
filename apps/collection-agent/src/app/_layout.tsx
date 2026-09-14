import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { queryClient, setupOnlineManager } from '@/api/queryClient';
import { AuthProvider, useAuth } from '@/store/auth';
import { resumeTrackingIfEnabled } from '@/location/tracking';
import { registerForPushNotifications, subscribeNotificationTaps } from '@/notifications/push';
import { ErrorBoundary } from '@/ui/ErrorBoundary';

setupOnlineManager();

function RootNavigation() {
  const { status } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (status === 'loading') return;
    const inAuthGroup = segments[0] === '(app)';
    if (status === 'signedIn' && !inAuthGroup) {
      router.replace('/(app)/home');
    } else if (status === 'signedOut' && inAuthGroup) {
      router.replace('/login');
    }
  }, [status, segments, router]);

  useEffect(() => {
    if (status !== 'signedIn') return;
    resumeTrackingIfEnabled();
    registerForPushNotifications();
    const unsubscribe = subscribeNotificationTaps(() => {
      router.push('/(app)/assignments');
    });
    return unsubscribe;
  }, [status, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="dark" />
            <RootNavigation />
          </AuthProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
