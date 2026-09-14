import { QueryClient, onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

let started = false;
export function setupOnlineManager() {
  if (started) return;
  started = true;
  onlineManager.setEventListener((setOnline) => {
    const sub = Network.addNetworkStateListener((state) => {
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    return () => sub.remove();
  });
}
