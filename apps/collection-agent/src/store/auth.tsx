import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchMe, login as loginRequest } from '@/api/agentApi';
import { setStoredToken, setUnauthorizedHandler } from '@/api/client';
import { hydrateDemoMode, setDemoMode } from '@/demo/demoMode';
import { resetDemoStore } from '@/demo/demoStore';
import { demoUser } from '@/demo/fixtures';
import { stopTracking } from '@/location/tracking';
import type { User } from '@/types/models';

const AGENT_PERMISSION = 'collection-agent-app.access';
const CACHED_USER_KEY = 'sunsea.collection.cachedUser';

interface AuthState {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: User | null;
  permissions: string[];
  isSuperAdmin: boolean;
  /** True while exploring the seeded demo dataset instead of a real session —
   * see demo/fixtures.ts and demo/demoStore.ts. */
  isDemo: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  /** Enters the seeded demo dataset with no server involved — see demo/. */
  enterDemo: () => Promise<void>;
  logout: () => Promise<void>;
  /** Signs out because the server address changed, not because the agent
   * chose to log out — same effect (stop tracking, clear the token), kept
   * as its own entry point so the server screen doesn't have to reach past
   * `logout`'s "agent decided to leave" framing. */
  signOutForServerChange: () => Promise<void>;
  clearError: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState & { isDemo: boolean }>({
    status: 'loading',
    user: null,
    permissions: [],
    isSuperAdmin: false,
    isDemo: false,
    error: null,
  });

  const signOut = useCallback(async () => {
    // Stop background GPS before clearing the token: once the token is gone,
    // any location pings still queued would just fail with 401 forever (the
    // backend has no way to accept locations for a logged-out session), and
    // continuing to track after logout is also a privacy leak the agent
    // didn't ask for. Best-effort — a stop failure must never block sign-out.
    await stopTracking().catch(() => {});
    await setStoredToken(null);
    await setDemoMode(false);
    await AsyncStorage.removeItem(CACHED_USER_KEY).catch(() => {});
    setState({ status: 'signedOut', user: null, permissions: [], isSuperAdmin: false, isDemo: false, error: null });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  // Hydrate: demo mode first (no server involved), else if a token is
  // stored, revalidate against /auth/me.
  useEffect(() => {
    (async () => {
      const demo = await hydrateDemoMode();
      if (demo) {
        setState({ status: 'signedIn', user: demoUser, permissions: [AGENT_PERMISSION], isSuperAdmin: false, isDemo: true, error: null });
        return;
      }
      const { getStoredToken } = await import('@/api/client');
      const token = await getStoredToken();
      if (!token) {
        setState((s) => ({ ...s, status: 'signedOut' }));
        return;
      }
      try {
        const me = await fetchMe();
        const allowed = me.isSuperAdmin || me.permissions.includes(AGENT_PERMISSION);
        if (!allowed) {
          await signOut();
          setState((s) => ({
            ...s,
            status: 'signedOut',
            error: 'This account is not a collection agent.',
          }));
          return;
        }
        setState({
          status: 'signedIn',
          user: me.user ?? null,
          permissions: me.permissions,
          isSuperAdmin: me.isSuperAdmin,
          isDemo: false,
          error: null,
        });
      } catch {
        await signOut();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, error: null }));
    const { accessToken, user } = await loginRequest(email, password);
    if (!accessToken) {
      throw new Error('Login failed: no access token returned.');
    }
    await setStoredToken(accessToken);
    const me = await fetchMe();
    const allowed = me.isSuperAdmin || me.permissions.includes(AGENT_PERMISSION);
    if (!allowed) {
      await setStoredToken(null);
      setState({
        status: 'signedOut',
        user: null,
        permissions: [],
        isSuperAdmin: false,
        isDemo: false,
        error: 'This account is not a collection agent.',
      });
      return;
    }
    setState({
      status: 'signedIn',
      user: me.user ?? user ?? null,
      permissions: me.permissions,
      isSuperAdmin: me.isSuperAdmin,
      isDemo: false,
      error: null,
    });
  }, []);

  const enterDemo = useCallback(async () => {
    resetDemoStore();
    await setDemoMode(true);
    setState({ status: 'signedIn', user: demoUser, permissions: [AGENT_PERMISSION], isSuperAdmin: false, isDemo: true, error: null });
  }, []);

  const clearError = useCallback(() => setState((s) => ({ ...s, error: null })), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      enterDemo,
      logout: signOut,
      signOutForServerChange: signOut,
      clearError,
      isAuthenticated: state.status === 'signedIn',
    }),
    [state, login, enterDemo, signOut, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
