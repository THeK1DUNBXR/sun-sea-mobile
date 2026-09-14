import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

export const TOKEN_KEY = 'insights.accessToken';

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://10.0.2.2:5000/api';

/** Called by the auth store when the server tells us the session is dead
 * (401 from any authenticated request). Also carries a short reason so the
 * UI can show a "you were signed out" banner instead of silently bouncing
 * to the login screen. */
let onUnauthorized: ((reason: string) => void) | null = null;
export function setUnauthorizedHandler(handler: ((reason: string) => void) | null) {
  onUnauthorized = handler;
}

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 20000,
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
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
      onUnauthorized?.(getErrorMessage(error, 'Your session has expired. Please sign in again.'));
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

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    if (isNetworkError(error)) {
      return error.code === 'ECONNABORTED'
        ? 'The request timed out. Check your connection and try again.'
        : 'No connection to the server. Check your internet and try again.';
    }
    const status = error.response?.status;
    const data = error.response?.data as { message?: string } | undefined;
    const serverMessage = data?.message;
    if (serverMessage) return serverMessage;
    if (status === 403) return "You don't have permission to view this.";
    if (status === 404) return 'Not found.';
    if (status === 429) return 'Too many requests. Please wait a moment and try again.';
    if (status && status >= 500) return 'The server ran into a problem. Please try again.';
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
