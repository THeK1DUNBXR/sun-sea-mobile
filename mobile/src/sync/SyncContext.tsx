import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Q } from '@nozbe/watermelondb';
import { AUTO_SYNC_INTERVAL_MS } from '../config';
import { tables } from '../db';
import { useObservable } from '../db/hooks';
import { useAuth } from '../auth/AuthContext';
import { getLastSync, runSync, SyncOutcome, SyncProgress } from './sync';

interface SyncState {
  online: boolean;
  syncing: boolean;
  progress: SyncProgress | null;
  lastSyncAt: number | null;
  lastError: string | null;
  lastOutcome: SyncOutcome | null;
  pending: { collections: number; orders: number; visits: number; attachments: number; total: number };
  sync: (opts?: { full?: boolean }) => Promise<SyncOutcome | null>;
}

const SyncCtx = createContext<SyncState | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastOutcome, setLastOutcome] = useState<SyncOutcome | null>(null);
  const onlineRef = useRef(true);

  // Live counts of unsynced records — drives the badge on the Sync tab.
  const pendingCollections = useObservable(() => tables.collections().query(Q.where('_status', Q.notEq('synced'))).observeCount(false), [], 0);
  const pendingOrders = useObservable(() => tables.orders().query(Q.where('_status', Q.notEq('synced'))).observeCount(false), [], 0);
  const pendingVisits = useObservable(() => tables.visits().query(Q.where('_status', Q.notEq('synced'))).observeCount(false), [], 0);
  const pendingAttachments = useObservable(() => tables.attachments().query(Q.where('remote_url', null)).observeCount(false), [], 0);

  useEffect(() => {
    getLastSync().then((s) => {
      setLastSyncAt(s.at);
      setLastError(s.error);
    });
  }, []);

  const sync = useCallback(
    async (opts?: { full?: boolean }) => {
      if (!isAuthenticated) return null;
      if (!onlineRef.current) {
        setLastError('Offline — changes are saved on the device and will sync automatically.');
        return null;
      }
      setSyncing(true);
      try {
        const outcome = await runSync(setProgress, opts);
        setLastOutcome(outcome);
        if (outcome.ok) {
          setLastSyncAt(outcome.finishedAt);
          setLastError(null);
        } else {
          setLastError(outcome.error ?? 'Sync failed');
        }
        return outcome;
      } finally {
        setSyncing(false);
      }
    },
    [isAuthenticated]
  );

  // Connectivity: sync as soon as we come back online.
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const isOnline = !!state.isConnected && state.isInternetReachable !== false;
      const wasOnline = onlineRef.current;
      onlineRef.current = isOnline;
      setOnline(isOnline);
      if (isOnline && !wasOnline) void sync();
    });
    return () => unsub();
  }, [sync]);

  // Foreground + interval auto-sync.
  useEffect(() => {
    if (!isAuthenticated) return;
    void sync();
    const timer = setInterval(() => void sync(), AUTO_SYNC_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void sync();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [isAuthenticated, sync]);

  // Anything newly captured triggers a sync shortly after (debounced).
  const pendingTotal = pendingCollections + pendingOrders + pendingVisits + pendingAttachments;
  useEffect(() => {
    if (!isAuthenticated || pendingTotal === 0) return;
    const t = setTimeout(() => void sync(), 1500);
    return () => clearTimeout(t);
  }, [pendingTotal, isAuthenticated, sync]);

  const value = useMemo<SyncState>(
    () => ({
      online,
      syncing,
      progress,
      lastSyncAt,
      lastError,
      lastOutcome,
      pending: {
        collections: pendingCollections,
        orders: pendingOrders,
        visits: pendingVisits,
        attachments: pendingAttachments,
        total: pendingTotal,
      },
      sync,
    }),
    [online, syncing, progress, lastSyncAt, lastError, lastOutcome, pendingCollections, pendingOrders, pendingVisits, pendingAttachments, pendingTotal, sync]
  );

  return <SyncCtx.Provider value={value}>{children}</SyncCtx.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncCtx);
  if (!ctx) throw new Error('useSync must be used inside SyncProvider');
  return ctx;
}
