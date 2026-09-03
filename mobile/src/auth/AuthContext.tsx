import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileApi } from '../api/mobileApi';
import { ApiError, setUnauthorizedHandler, tokenStore } from '../api/client';
import type { Bootstrap } from '../api/types';
import { STORAGE_KEYS } from '../config';
import { resetDatabase } from '../db';
import { DEMO_AGENT, seedDemoData } from '../demo/seed';

export interface AgentProfile {
  userId: string;
  fullName: string;
  email?: string | null;
  isSuperAdmin: boolean;
}

interface AuthState {
  ready: boolean;
  isAuthenticated: boolean;
  /** Token rejected by the server — data stays on the device, user must sign in again. */
  sessionExpired: boolean;
  agent: AgentProfile | null;
  bootstrap: Bootstrap | null;
  /** Prototype mode: sample data on the device, no server calls at all. */
  isDemo: boolean;
  login: (username: string, password: string) => Promise<void>;
  enterDemo: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [token, agentJson, bootJson, demo] = await Promise.all([
          tokenStore.get(),
          AsyncStorage.getItem(STORAGE_KEYS.agent),
          AsyncStorage.getItem(STORAGE_KEYS.bootstrap),
          AsyncStorage.getItem(STORAGE_KEYS.demo),
        ]);
        if (agentJson) setAgent(JSON.parse(agentJson));
        if (bootJson) setBootstrap(JSON.parse(bootJson));
        setIsDemo(demo === '1');
        setHasToken(!!token || demo === '1');
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      // Keep local data; just force a re-login when the server rejects the token.
      void tokenStore.clear();
      setHasToken(false);
      setSessionExpired(true);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await mobileApi.login(username.trim(), password);
      await tokenStore.set(res.accessToken);

      let boot: Bootstrap | null = null;
      try {
        boot = await mobileApi.bootstrap();
      } catch (err) {
        await tokenStore.clear();
        if (err instanceof ApiError && err.status === 403) {
          throw new ApiError(403, 'This account is not enabled for the field app. Ask the office to grant the "Mobile App" permission.');
        }
        throw err;
      }

      const previous = agent;
      const nextAgent: AgentProfile = {
        userId: boot.agent.userId,
        fullName: boot.agent.fullName,
        email: boot.agent.email,
        isSuperAdmin: boot.agent.isSuperAdmin,
      };
      if (previous && previous.userId !== nextAgent.userId) {
        // A different agent on this device — never mix their offline data.
        await resetDatabase();
        await AsyncStorage.multiRemove([STORAGE_KEYS.lastSyncAt, STORAGE_KEYS.lastSyncError]);
      }
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.agent, JSON.stringify(nextAgent)],
        [STORAGE_KEYS.bootstrap, JSON.stringify(boot)],
      ]);
      await AsyncStorage.removeItem(STORAGE_KEYS.demo);
      setIsDemo(false);
      setAgent(nextAgent);
      setBootstrap(boot);
      setSessionExpired(false);
      setHasToken(true);
    },
    [agent]
  );

  const enterDemo = useCallback(async () => {
    await seedDemoData();
    const demoAgent: AgentProfile = { ...DEMO_AGENT };
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.demo, '1'],
      [STORAGE_KEYS.agent, JSON.stringify(demoAgent)],
      [STORAGE_KEYS.lastSyncAt, String(Date.now())],
      [STORAGE_KEYS.lastSyncError, ''],
    ]);
    await AsyncStorage.removeItem(STORAGE_KEYS.bootstrap);
    await tokenStore.clear();
    setBootstrap(null);
    setAgent(demoAgent);
    setIsDemo(true);
    setSessionExpired(false);
    setHasToken(true);
  }, []);

  const logout = useCallback(async () => {
    if (isDemo) {
      await AsyncStorage.multiRemove([STORAGE_KEYS.demo, STORAGE_KEYS.agent, STORAGE_KEYS.lastSyncAt]);
      await resetDatabase();
      setIsDemo(false);
      setAgent(null);
      setHasToken(false);
      return;
    }
    try {
      await mobileApi.logout();
    } catch {
      /* offline logout is fine — the session expires server-side */
    }
    await tokenStore.clear();
    setHasToken(false);
    setSessionExpired(false);
    // Agent profile + local data are kept so the same person can log back in offline-safe.
  }, [isDemo]);

  const value = useMemo<AuthState>(
    () => ({ ready, isAuthenticated: hasToken, sessionExpired, agent, bootstrap, isDemo, login, enterDemo, logout }),
    [ready, hasToken, sessionExpired, agent, bootstrap, isDemo, login, enterDemo, logout]
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
