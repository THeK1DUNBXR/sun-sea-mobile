import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { tables } from '../db';
import { useQuery } from '../db/hooks';
import { useAuth } from '../auth/AuthContext';
import { flushPositions, getShareStatus, isSharingEnabled, isTracking, setSharingEnabled, startTracking, stopTracking, type ShareStatus } from './positions';
import { todayYmd } from '../utils/format';

interface State {
  enabled: boolean;
  tracking: boolean;
  status: ShareStatus | null;
  setEnabled: (on: boolean) => Promise<void>;
  refreshStatus: () => Promise<void>;
}
const Ctx = createContext<State>({ enabled: true, tracking: false, status: null, setEnabled: async () => undefined, refreshStatus: async () => undefined });

/** Runs the foreground tracker while the day is open, the setting is on, and this is not the demo. */
export function LocationSharingProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isDemo } = useAuth();
  const [enabled, setEnabledState] = useState(true);
  const [tracking, setTracking] = useState(false);
  const [status, setStatus] = useState<ShareStatus | null>(null);
  const today = todayYmd();
  const session = useQuery(() => tables.daySessions().query(Q.where('date', today)), [today])[0];
  const dayOpen = session?.status === 'OPEN';

  const refreshStatus = useCallback(async () => setStatus(await getShareStatus()), []);
  useEffect(() => {
    isSharingEnabled().then(setEnabledState);
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const shouldRun = isAuthenticated && !isDemo && enabled && dayOpen;
    let cancelled = false;
    (async () => {
      if (shouldRun) {
        const ok = await startTracking();
        if (!cancelled) setTracking(ok && isTracking());
        void flushPositions().then(refreshStatus);
      } else {
        stopTracking();
        setTracking(false);
      }
    })();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && shouldRun) void startTracking().then(() => setTracking(isTracking()));
      if (s === 'active') void flushPositions().then(refreshStatus);
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [isAuthenticated, isDemo, enabled, dayOpen, refreshStatus]);

  // Stop for good when logging out.
  useEffect(() => {
    if (!isAuthenticated) stopTracking();
  }, [isAuthenticated]);

  const setEnabled = useCallback(
    async (on: boolean) => {
      await setSharingEnabled(on);
      setEnabledState(on);
      if (!on) stopTracking();
    },
    []
  );

  const value = useMemo(() => ({ enabled, tracking, status, setEnabled, refreshStatus }), [enabled, tracking, status, setEnabled, refreshStatus]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useLocationSharing = () => useContext(Ctx);
