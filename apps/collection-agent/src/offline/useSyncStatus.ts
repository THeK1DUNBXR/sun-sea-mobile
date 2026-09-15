import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { flush, getQueue, subscribeQueue, type QueueItem } from './queue';

export interface SyncStatus {
  pendingCount: number;
  items: QueueItem[];
  syncing: boolean;
  lastError: string | null;
  flushNow: () => void;
}

/** UI-facing hook: pending queue count, syncing state, last error; flushes on foreground. */
export function useSyncStatus(): SyncStatus {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [syncing, setSyncing] = useState(false);

  const flushNow = useCallback(() => {
    setSyncing(true);
    flush().finally(() => setSyncing(false));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeQueue(setItems);
    getQueue().then(setItems);
    flushNow();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') flushNow();
    });
    return () => {
      unsubscribe();
      sub.remove();
    };
  }, [flushNow]);

  const lastError = items.find((i) => i.lastError)?.lastError ?? null;

  return { pendingCount: items.length, items, syncing, lastError, flushNow };
}
