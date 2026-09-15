import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

import { hydrateServerUrl } from './serverUrl';
import { isDemoMode } from '@/demo/demoMode';

export const ACCESS_TOKEN_KEY = 'sunsea.collection.accessToken';

// Set by the auth store on hydrate/login/logout so the client can react to
// a 401 without creating a circular import between api/client and store/auth.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string | null) {
  try {
    if (token) {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    }
  } catch {
    // SecureStore unavailable (e.g. web) — ignore, session just won't persist.
  }
}

// baseURL is intentionally not set here: it's resolved per request below, so
// that changing the server address in Settings takes effect on the very next
// call without recreating this client or restarting the app. This same
// client is used from the headless background-location task and the offline
// queue flush, so the resolve below must work from any JS context.
export const apiClient = axios.create({
  timeout: 30000,
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // Resolves from the in-memory cache once hydrated (the common case, and
  // cheap even from a headless context); on the very first request of a cold
  // start it awaits the one-time AsyncStorage read.
  config.baseURL = await hydrateServerUrl();
  // Demo mode never touches the network. Every route agentApi.ts exposes is
  // already answered locally (see demo/demoStore.ts); this is a safety net
  // for anything that reaches apiClient directly without going through one
  // of those branches, so a stray call can never 401 the demo session out —
  // there's no token to send anyway.
  if (isDemoMode()) {
    config.adapter = async () => ({
      data: { success: true, data: {} },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
      request: {},
    });
    return config;
  }
  const token = await getStoredToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await setStoredToken(null);
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

// Standard backend envelope: { success, message, data }.
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export function unwrap<T>(response: { data: ApiResponse<T> }): T {
  return response.data?.data as T;
}
