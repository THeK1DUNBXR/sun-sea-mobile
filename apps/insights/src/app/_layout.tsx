import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/store/auth';
import { usePalette } from '@/ui/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RootBackground({ children }: { children: React.ReactNode }) {
  const palette = usePalette();
  return <View style={{ flex: 1, backgroundColor: palette.bg }}>{children}</View>;
}

export default function RootLayout() {
  const scheme = useColorScheme();

  return (
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
  );
}
