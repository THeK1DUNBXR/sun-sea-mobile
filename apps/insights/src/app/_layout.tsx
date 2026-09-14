import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { AppState, type AppStateStatus, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/store/auth';
import { ErrorBoundary } from '@/ui/ErrorBoundary';
import { usePalette } from '@/ui/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// React Query's `refetchInterval` polling and its "pause while unfocused"
// behavior both key off `focusManager`, but on React Native nothing drives it
// by default — unlike on web there's no `visibilitychange` event, so without
// this every screen's 30-60s auto-refresh keeps firing (spending battery and
// data, and racing setState-after-unmount) while the app sits backgrounded.
// Route it off AppState instead. (No NetInfo/expo-network dependency is
// available in this app, so online/offline detection stays at the per-request
// level — see getErrorMessage/isNetworkError in api/client.ts and the "showing
// last known data" banners on each screen, rather than a global onlineManager.)
function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === 'active');
}

function RootBackground({ children }: { children: React.ReactNode }) {
  const palette = usePalette();
  return <View style={{ flex: 1, backgroundColor: palette.bg }}>{children}</View>;
}

export default function RootLayout() {
  const scheme = useColorScheme();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SafeAreaProvider>
            <RootBackground>
              <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="login" />
                <Stack.Screen name="(tabs)" />
              </Stack>
            </RootBackground>
          </SafeAreaProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
