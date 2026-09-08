import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { http, KEYS, setUnauthorizedHandler, tokenStore, unwrap } from '../api/client';
import { getServerInfo, getServerMode } from '../api/server';
import { demoDataset } from './demo';
import { loadLiveDataset } from './live';
import { computeMetrics, type Metrics } from './metrics';
import type { Dataset } from './types';

export type Source = 'demo' | 'live';

interface DataState {
  ready: boolean;
  source: Source;
  dataset: Dataset;
  metrics: Metrics;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  authenticated: boolean;
  user: { fullName: string; email?: string } | null;
  serverHost: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  useDemo: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState<Source>('demo');
  const [dataset, setDataset] = useState<Dataset>(demoDataset);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<DataState['user']>(null);
  const [serverHost, setServerHost] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (source !== 'live') return;
    setLoading(true);
    setError(null);
    try {
      const mode = await getServerMode();
      const ds = await loadLiveDataset(mode === 'mobile');
      setDataset(ds);
      setLastUpdated(ds.generatedAt);
      await AsyncStorage.multiSet([
        [KEYS.cache, JSON.stringify({ ...ds, days: ds.days.map((d) => ({ ...d, date: d.date.toISOString() })) })],
        [KEYS.cacheAt, String(ds.generatedAt)],
      ]);
    } catch (e) {
      setError((e as Error).message || 'Could not load live data');
    } finally {
      setLoading(false);
    }
  }, [source]);

  useEffect(() => {
    (async () => {
      try {
        const [token, userJson, src, cache, cacheAt, info] = await Promise.all([tokenStore.get(), AsyncStorage.getItem(KEYS.user), AsyncStorage.getItem(KEYS.source), AsyncStorage.getItem(KEYS.cache), AsyncStorage.getItem(KEYS.cacheAt), getServerInfo()]);
        setServerHost(info?.host ?? null);
        if (userJson) setUser(JSON.parse(userJson));
        const live = !!token && src === 'live';
        setAuthenticated(!!token);
        setSource(live ? 'live' : 'demo');
        if (live && cache) {
          const parsed = JSON.parse(cache) as Dataset;
          parsed.days = parsed.days.map((d) => ({ ...d, date: new Date(d.date as unknown as string) }));
          setDataset(parsed);
          setLastUpdated(Number(cacheAt) || null);
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

  useEffect(() => {
    if (ready && source === 'live' && authenticated) void refresh();
  }, [ready, source, authenticated, refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = unwrap<{ accessToken: string; user: { fullName: string; email?: string } }>(await http.post('/auth/login', { email, password }));
    await tokenStore.set(res.accessToken);
    const u = { fullName: res.user?.fullName ?? email, email: res.user?.email };
    await AsyncStorage.multiSet([
      [KEYS.user, JSON.stringify(u)],
      [KEYS.source, 'live'],
    ]);
    setUser(u);
    setAuthenticated(true);
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
    await AsyncStorage.multiRemove([KEYS.user, KEYS.cache, KEYS.cacheAt]);
    await AsyncStorage.setItem(KEYS.source, 'demo');
    setAuthenticated(false);
    setUser(null);
    setSource('demo');
    setDataset(demoDataset);
    setLastUpdated(null);
  }, []);

  const useDemo = useCallback(async () => {
    await AsyncStorage.setItem(KEYS.source, 'demo');
    setSource('demo');
    setDataset(demoDataset);
  }, []);

  const metrics = useMemo(() => computeMetrics(dataset), [dataset]);
  const value = useMemo<DataState>(() => ({ ready, source, dataset, metrics, loading, error, lastUpdated, authenticated, user, serverHost, login, logout, useDemo, refresh }), [ready, source, dataset, metrics, loading, error, lastUpdated, authenticated, user, serverHost, login, logout, useDemo, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData outside DataProvider');
  return v;
}
export const useDataset = () => useData().dataset;
export const useMetrics = () => useData().metrics;
