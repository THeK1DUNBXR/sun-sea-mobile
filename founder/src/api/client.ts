import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

export const DEFAULT_API_URL: string = process.env.EXPO_PUBLIC_API_URL || (Constants.expoConfig?.extra?.apiUrl as string | undefined) || 'https://sunseaerp-production.up.railway.app/api';

export const KEYS = { apiUrl: 'insights.apiUrl', token: 'insights.token', user: 'insights.user', source: 'insights.source', serverInfo: 'insights.serverInfo', cache: 'insights.cache', cacheAt: 'insights.cacheAt' } as const;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function getApiUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(KEYS.apiUrl);
    if (saved) return saved.replace(/\/+$/, '');
  } catch {
    /* ignore */
  }
  return DEFAULT_API_URL.replace(/\/+$/, '');
}
export const setApiUrl = (url: string) => AsyncStorage.setItem(KEYS.apiUrl, url.trim());

export const tokenStore = {
  get: () => SecureStore.getItemAsync(KEYS.token),
  set: (t: string) => SecureStore.setItemAsync(KEYS.token, t),
  clear: () => SecureStore.deleteItemAsync(KEYS.token),
};

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

export const http = axios.create({ timeout: 60000, headers: { 'Content-Type': 'application/json' } });
http.interceptors.request.use(async (config) => {
  config.baseURL = await getApiUrl();
  const token = await tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
const RETRY = new Set([502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
http.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<{ message?: string }>) => {
    const cfg = error.config as (typeof error.config & { __retries?: number }) | undefined;
    if (cfg && (cfg.method || 'get').toLowerCase() === 'get' && (!error.response || RETRY.has(error.response.status)) && (cfg.__retries ?? 0) < 2) {
      cfg.__retries = (cfg.__retries ?? 0) + 1;
      await sleep(1500 * cfg.__retries);
      return http.request(cfg);
    }
    if (error.response?.status === 401 && !String(cfg?.url).includes('/auth/login')) onUnauthorized?.();
    if (!error.response) return Promise.reject(new ApiError(0, 'No connection to the server.'));
    return Promise.reject(new ApiError(error.response.status, error.response.data?.message || `Request failed (${error.response.status})`));
  }
);

/** Unwraps the ERP's `{ success, message, data }` envelope. */
export const unwrap = <T>(res: { data: { data?: T } & Partial<T> }): T => (res.data?.data !== undefined ? res.data.data : (res.data as unknown)) as T;
