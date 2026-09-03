import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileApi } from '../api/mobileApi';
import { ApiError, setUnauthorizedHandler, tokenStore } from '../api/client';
import type { Bootstrap } from '../api/types';
import { STORAGE_KEYS } from '../config';
import { resetDatabase } from '../db';

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
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [token, agentJson, bootJson] = await Promise.all([
          tokenStore.get(),
          AsyncStorage.getItem(STORAGE_KEYS.agent),
          AsyncStorage.getItem(STORAGE_KEYS.bootstrap),
        ]);
        if (agentJson) setAgent(JSON.parse(agentJson));
        if (bootJson) setBootstrap(JSON.parse(bootJson));
        setHasToken(!!token);
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
      setAgent(nextAgent);
      setBootstrap(boot);
      setSessionExpired(false);
      setHasToken(true);
    },
    [agent]
  );

  const logout = useCallback(async () => {
    try {
      await mobileApi.logout();
    } catch {
      /* offline logout is fine — the session expires server-side */
    }
    await tokenStore.clear();
    setHasToken(false);
    setSessionExpired(false);
    // Agent profile + local data are kept so the same person can log back in offline-safe.
  }, []);

  const value = useMemo<AuthState>(
    () => ({ ready, isAuthenticated: hasToken, sessionExpired, agent, bootstrap, login, logout }),
    [ready, hasToken, sessionExpired, agent, bootstrap, login, logout]
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
