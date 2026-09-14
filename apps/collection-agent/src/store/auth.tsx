import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchMe, login as loginRequest } from '@/api/agentApi';
import { setStoredToken, setUnauthorizedHandler } from '@/api/client';
import type { User } from '@/types/models';

const AGENT_PERMISSION = 'collection-agent-app.access';
const CACHED_USER_KEY = 'sunsea.collection.cachedUser';

interface AuthState {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: User | null;
  permissions: string[];
  isSuperAdmin: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: 'loading',
    user: null,
    permissions: [],
    isSuperAdmin: false,
    error: null,
  });

  const signOut = useCallback(async () => {
    await setStoredToken(null);
    await AsyncStorage.removeItem(CACHED_USER_KEY).catch(() => {});
    setState({ status: 'signedOut', user: null, permissions: [], isSuperAdmin: false, error: null });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  // Hydrate: if a token is stored, revalidate against /auth/me.
  useEffect(() => {
    (async () => {
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
        error: 'This account is not a collection agent.',
      });
      return;
    }
    setState({
      status: 'signedIn',
      user: me.user ?? user ?? null,
      permissions: me.permissions,
      isSuperAdmin: me.isSuperAdmin,
      error: null,
    });
  }, []);

  const clearError = useCallback(() => setState((s) => ({ ...s, error: null })), []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout: signOut, clearError }),
    [state, login, signOut, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
