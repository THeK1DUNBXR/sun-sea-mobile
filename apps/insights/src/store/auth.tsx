import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import { setUnauthorizedHandler, TOKEN_KEY } from '@/api/client';
import { fetchMe, login as loginRequest } from '@/api/insightsApi';
import type { MeResponse, User } from '@/types';

export const REQUIRED_PERMISSION = 'insights-app.access';
const USER_KEY = 'insights.user';

interface AuthState {
  isHydrating: boolean;
  isAuthenticated: boolean;
  user: User | null;
  permissions: string[];
  isSuperAdmin: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function hasAccess(me: MeResponse | null, user: User | null): boolean {
  const isSuperAdmin = Boolean(
    me?.isSuperAdmin || me?.profile?.isSuperAdmin || me?.user?.isSuperAdmin || user?.isSuperAdmin
  );
  if (isSuperAdmin) return true;
  return Boolean(me?.permissions?.includes(REQUIRED_PERMISSION));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isHydrating, setIsHydrating] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(async () => {
    setIsAuthenticated(false);
    setUser(null);
    setPermissions([]);
    setIsSuperAdmin(false);
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch {
      // best-effort
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) return;
        const me = await fetchMe();
        if (!hasAccess(me, me.user ?? null)) {
          await logout();
          return;
        }
        setUser(me.user ?? null);
        setPermissions(me.permissions ?? []);
        setIsSuperAdmin(
          Boolean(me.isSuperAdmin || me.profile?.isSuperAdmin || me.user?.isSuperAdmin)
        );
        setIsAuthenticated(true);
      } catch {
        await logout();
      } finally {
        setIsHydrating(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const { tokens, user: loggedInUser } = await loginRequest(email, password);
      if (!tokens?.accessToken) {
        throw new Error('Login did not return a valid session token.');
      }
      await SecureStore.setItemAsync(TOKEN_KEY, tokens.accessToken);

      const me = await fetchMe();
      if (!hasAccess(me, loggedInUser)) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        throw new Error(
          'This account does not have access to the Insights app. Ask an admin to grant "insights-app.access".'
        );
      }

      setUser(me.user ?? loggedInUser ?? null);
      setPermissions(me.permissions ?? []);
      setIsSuperAdmin(
        Boolean(me.isSuperAdmin || me.profile?.isSuperAdmin || me.user?.isSuperAdmin || loggedInUser?.isSuperAdmin)
      );
      setIsAuthenticated(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in. Please try again.';
      setError(message);
      throw err;
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      isHydrating,
      isAuthenticated,
      user,
      permissions,
      isSuperAdmin,
      error,
      login,
      logout,
    }),
    [isHydrating, isAuthenticated, user, permissions, isSuperAdmin, error, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
