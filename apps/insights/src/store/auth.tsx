import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import { getErrorMessage, setUnauthorizedHandler, TOKEN_KEY } from '@/api/client';
import { fetchMe, login as loginRequest } from '@/api/insightsApi';
import { auth as authCopy, login as loginCopy, REQUIRED_PERMISSION, serverScreen as serverCopy } from '@/copy';
import { demoMe, demoUser } from '@/demo/fixtures';
import { hydrateDemoMode, setDemoMode } from '@/demo/demoMode';
import type { MeResponse, User } from '@/types';

export { REQUIRED_PERMISSION };

interface AuthState {
  isHydrating: boolean;
  isAuthenticated: boolean;
  user: User | null;
  permissions: string[];
  isSuperAdmin: boolean;
  /** True while exploring the seeded demo dataset instead of a real session —
   * see demo/fixtures.ts and demo/demoAdapter.ts. */
  isDemo: boolean;
  /** Set right after the server forcibly ends the session (expired/invalid token,
   * account deactivated mid-session). Cleared once shown or on the next login. */
  sessionMessage: string | null;
  dismissSessionMessage: () => void;
  login: (email: string, password: string) => Promise<void>;
  /** Enters the seeded demo dataset with no server involved — see demo/. */
  enterDemo: () => Promise<void>;
  logout: () => Promise<void>;
  /** Logs out and leaves a note explaining why — used when the founder points
   * the app at a different server address than the one they're signed in on. */
  signOutForServerChange: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** Permissions come only from /auth/me (login itself doesn't return them) — see
 * auth.service.ts login()/getProfile(). A super admin bypasses every permission
 * check server-side (requireAnyPermission), so mirror that here too. */
function hasAccess(me: MeResponse): boolean {
  if (me.isSuperAdmin || me.user?.isSuperAdmin) return true;
  return me.permissions.includes(REQUIRED_PERMISSION);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isHydrating, setIsHydrating] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  // Guards against setState after unmount from the boot-time fetchMe() probe,
  // which can resolve after the provider (and app) has already torn down.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const logout = useCallback(async () => {
    if (mountedRef.current) {
      setIsAuthenticated(false);
      setUser(null);
      setPermissions([]);
      setIsSuperAdmin(false);
      setIsDemo(false);
    }
    await setDemoMode(false);
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // best-effort
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler((reason) => {
      if (mountedRef.current) setSessionMessage(reason);
      void logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    (async () => {
      try {
        const demo = await hydrateDemoMode();
        if (demo) {
          if (!mountedRef.current) return;
          setUser(demoUser);
          setPermissions(demoMe.permissions);
          setIsSuperAdmin(false);
          setIsDemo(true);
          setIsAuthenticated(true);
          return;
        }
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) return;
        const me = await fetchMe();
        if (!hasAccess(me)) {
          await logout();
          return;
        }
        if (!mountedRef.current) return;
        setUser(me.user);
        setPermissions(me.permissions ?? []);
        setIsSuperAdmin(Boolean(me.isSuperAdmin || me.user?.isSuperAdmin));
        setIsAuthenticated(true);
      } catch {
        await logout();
      } finally {
        if (mountedRef.current) setIsHydrating(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const loginResult = await loginRequest(email, password);
      if (!loginResult?.accessToken) {
        throw new Error(authCopy.noSessionToken);
      }
      await SecureStore.setItemAsync(TOKEN_KEY, loginResult.accessToken);

      let me: MeResponse;
      try {
        me = await fetchMe();
      } catch (meErr) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        throw new Error(getErrorMessage(meErr, authCopy.verifyAccessFailed));
      }

      if (!hasAccess(me)) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        throw new Error(authCopy.noAccess);
      }

      if (!mountedRef.current) return;
      setUser(me.user ?? loginResult.user);
      setPermissions(me.permissions ?? []);
      setIsSuperAdmin(Boolean(me.isSuperAdmin || me.user?.isSuperAdmin || loginResult.user?.isSuperAdmin));
      setIsAuthenticated(true);
      setSessionMessage(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : getErrorMessage(err, loginCopy.signInFailed);
      throw err instanceof Error ? err : new Error(message);
    }
  }, []);

  const enterDemo = useCallback(async () => {
    await setDemoMode(true);
    if (!mountedRef.current) return;
    setUser(demoUser);
    setPermissions(demoMe.permissions);
    setIsSuperAdmin(false);
    setIsDemo(true);
    setIsAuthenticated(true);
    setSessionMessage(null);
  }, []);

  const dismissSessionMessage = useCallback(() => setSessionMessage(null), []);

  const signOutForServerChange = useCallback(async () => {
    await logout();
    if (mountedRef.current) setSessionMessage(serverCopy.signedOutNotice);
  }, [logout]);

  const value = useMemo<AuthState>(
    () => ({
      isHydrating,
      isAuthenticated,
      user,
      permissions,
      isSuperAdmin,
      isDemo,
      sessionMessage,
      dismissSessionMessage,
      login,
      enterDemo,
      logout,
      signOutForServerChange,
    }),
    [
      isHydrating,
      isAuthenticated,
      user,
      permissions,
      isSuperAdmin,
      isDemo,
      sessionMessage,
      dismissSessionMessage,
      login,
      enterDemo,
      logout,
      signOutForServerChange,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
