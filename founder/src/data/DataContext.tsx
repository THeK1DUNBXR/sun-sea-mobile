import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { http, KEYS, setUnauthorizedHandler, tokenStore, unwrap } from '../api/client';
import { getServerInfo, getServerMode } from '../api/server';
import { demoDataset } from './demo';
import { emptyDataset, loadLiveDataset } from './live';
import { computeMetrics, type Metrics } from './metrics';
import type { Dataset } from './types';
import type { FeedStatus } from './feeds';

export type Source = 'demo' | 'live';

/** How often live figures are re-pulled while the app is on screen (the ERP TV wall polls every 30 s). */
export const AUTO_REFRESH_MS = 60_000;
/** Coming back to the app after this long triggers an immediate refresh. */
const STALE_AFTER_MS = 45_000;

interface DataState {
  ready: boolean;
  source: Source;
  dataset: Dataset;
  metrics: Metrics;
  loading: boolean;
  /** `done/total` feeds of the run in flight, for the status strip. */
  progress: { done: number; total: number } | null;
  error: string | null;
  lastUpdated: number | null;
  nextRefreshAt: number | null;
  feeds: FeedStatus[];
  authenticated: boolean;
  /** True once the user has either signed in or explicitly chosen the demo dataset. */
  chosen: boolean;
  user: { fullName: string; email?: string } | null;
  serverHost: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  useDemo: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<DataState | null>(null);

const serialize = (ds: Dataset) => JSON.stringify({ ...ds, days: ds.days.map((d) => ({ ...d, date: d.date.toISOString() })) });
const deserialize = (raw: string): Dataset => {
  const parsed = JSON.parse(raw) as Dataset;
  parsed.days = parsed.days.map((d) => ({ ...d, date: new Date(d.date as unknown as string) }));
  return parsed;
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState<Source>('demo');
  const [dataset, setDataset] = useState<Dataset>(demoDataset);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<DataState['progress']>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [nextRefreshAt, setNextRefreshAt] = useState<number | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [chosen, setChosen] = useState(false);
  const [user, setUser] = useState<DataState['user']>(null);
  const [serverHost, setServerHost] = useState<string | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const lastUpdatedRef = useRef<number | null>(null);

  const live = source === 'live' && authenticated;

  const refresh = useCallback(async () => {
    if (!live) return;
    if (inFlight.current) return inFlight.current; // one run at a time; callers share it
    const run = (async () => {
      setLoading(true);
      setError(null);
      try {
        const mode = await getServerMode();
        const ds = await loadLiveDataset(mode === 'mobile', (done, total) => setProgress({ done, total }));
        setDataset(ds);
        setLastUpdated(ds.generatedAt);
        lastUpdatedRef.current = ds.generatedAt;
        const failed = (ds.feeds ?? []).filter((f) => !f.ok);
        // Every feed failing means the server itself is unreachable; partial failures are reported per feed.
        if (failed.length && failed.length === (ds.feeds ?? []).length) setError(failed[0].error ?? 'Could not reach the server');
        try {
          const raw = serialize(ds);
          if (raw.length < 1_500_000) await AsyncStorage.multiSet([[KEYS.cache, raw], [KEYS.cacheAt, String(ds.generatedAt)]]);
        } catch {
          /* cache is best effort */
        }
      } catch (e) {
        setError((e as Error).message || 'Could not load live data');
      } finally {
        setLoading(false);
        setProgress(null);
        setNextRefreshAt(Date.now() + AUTO_REFRESH_MS);
        inFlight.current = null;
      }
    })();
    inFlight.current = run;
    return run;
  }, [live]);

  // ── boot: restore session, source and the last dataset ──────────────────
  useEffect(() => {
    (async () => {
      try {
        const [token, userJson, src, cache, cacheAt, info] = await Promise.all([tokenStore.get(), AsyncStorage.getItem(KEYS.user), AsyncStorage.getItem(KEYS.source), AsyncStorage.getItem(KEYS.cache), AsyncStorage.getItem(KEYS.cacheAt), getServerInfo()]);
        setServerHost(info?.host ?? null);
        if (userJson) setUser(JSON.parse(userJson));
        const isLive = !!token && src === 'live';
        setAuthenticated(!!token);
        setSource(isLive ? 'live' : 'demo');
        setChosen(isLive || src === 'demo');
        if (isLive) {
          if (cache) {
            try {
              setDataset(deserialize(cache));
              const at = Number(cacheAt) || null;
              setLastUpdated(at);
              lastUpdatedRef.current = at;
            } catch {
              setDataset(emptyDataset());
            }
          } else {
            setDataset(emptyDataset());
          }
        }
      } finally {
        setReady(true);
      }
    })();
    setUnauthorizedHandler(() => {
      setAuthenticated(false);
      setError('Session expired — sign in again.');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // ── first load, periodic refresh, and refresh on returning to the app ────
  useEffect(() => {
    if (!ready || !live) {
      setNextRefreshAt(null);
      return;
    }
    void refresh();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void refresh();
    }, AUTO_REFRESH_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && (!lastUpdatedRef.current || Date.now() - lastUpdatedRef.current > STALE_AFTER_MS)) void refresh();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [ready, live, refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = unwrap<{ accessToken: string; user: { fullName: string; email?: string } }>(await http.post('/auth/login', { email, password }));
    await tokenStore.set(res.accessToken);
    const u = { fullName: res.user?.fullName ?? email, email: res.user?.email };
    await AsyncStorage.multiSet([
      [KEYS.user, JSON.stringify(u)],
      [KEYS.source, 'live'],
    ]);
    setUser(u);
    setDataset(emptyDataset());
    setLastUpdated(null);
    lastUpdatedRef.current = null;
    setError(null);
    setAuthenticated(true);
    setChosen(true);
    setSource('live');
    const info = await getServerInfo();
    setServerHost(info?.host ?? null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await http.post('/auth/logout');
    } catch {
      /* fine offline */
    }
    await tokenStore.clear();
    await AsyncStorage.multiRemove([KEYS.user, KEYS.cache, KEYS.cacheAt, KEYS.source]);
    setAuthenticated(false);
    setChosen(false);
    setUser(null);
    setSource('demo');
    setDataset(demoDataset);
    setLastUpdated(null);
    lastUpdatedRef.current = null;
    setError(null);
  }, []);

  const useDemo = useCallback(async () => {
    await AsyncStorage.setItem(KEYS.source, 'demo');
    setChosen(true);
    setSource('demo');
    setDataset(demoDataset);
    setError(null);
  }, []);

  const metrics = useMemo(() => computeMetrics(dataset), [dataset]);
  const feeds = dataset.feeds ?? [];
  const value = useMemo<DataState>(
    () => ({ ready, source, dataset, metrics, loading, progress, error, lastUpdated, nextRefreshAt, feeds, authenticated, chosen, user, serverHost, login, logout, useDemo, refresh }),
    [ready, source, dataset, metrics, loading, progress, error, lastUpdated, nextRefreshAt, feeds, authenticated, chosen, user, serverHost, login, logout, useDemo, refresh]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData outside DataProvider');
  return v;
}
export const useDataset = () => useData().dataset;
export const useMetrics = () => useData().metrics;
