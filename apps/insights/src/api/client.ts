import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

import { auth as authCopy, errors as errorCopy } from '@/copy';
import { hydrateServerUrl } from './serverUrl';

export const TOKEN_KEY = 'insights.accessToken';

/** Called by the auth store when the server tells us the session is dead
 * (401 from any authenticated request). Also carries a short reason so the
 * UI can show a "you were signed out" banner instead of silently bouncing
 * to the login screen. */
let onUnauthorized: ((reason: string) => void) | null = null;
export function setUnauthorizedHandler(handler: ((reason: string) => void) | null) {
  onUnauthorized = handler;
}

// baseURL is intentionally not set here: it's resolved per request below, so
// that changing the server address in Settings takes effect on the very next
// call without recreating this client or restarting the app.
export const apiClient = axios.create({
  timeout: 20000,
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // Resolves from the in-memory cache once hydrated (the common case); on the
  // very first request of a cold start it awaits the one-time AsyncStorage read.
  config.baseURL = await hydrateServerUrl();
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
  } catch {
    // SecureStore unavailable (e.g. web preview) - proceed unauthenticated.
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Don't treat a 401 on the login request itself as a "session expired"
    // event — that's just a wrong password, and firing the sign-out handler
    // for it would be a no-op today but is a latent bug waiting for one.
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      onUnauthorized?.(getErrorMessage(error, authCopy.sessionExpiredFallback));
    }
    return Promise.reject(error);
  }
);

/** True for a request that never reached the server: offline, DNS failure,
 * timeout, or the connection was dropped mid-transfer. */
export function isNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  return !error.response;
}

export function getErrorMessage(error: unknown, fallback = errorCopy.generic): string {
  if (axios.isAxiosError(error)) {
    if (isNetworkError(error)) {
      return error.code === 'ECONNABORTED' ? errorCopy.timeout : errorCopy.offline;
    }
    const status = error.response?.status;
    const data = error.response?.data as { message?: string } | undefined;
    const serverMessage = data?.message;
    if (serverMessage) return serverMessage;
    if (status === 403) return errorCopy.forbidden;
    if (status === 404) return errorCopy.notFound;
    if (status === 429) return errorCopy.rateLimited;
    if (status && status >= 500) return errorCopy.server;
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
