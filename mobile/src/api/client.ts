import axios, { AxiosError, AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_API_URL, STORAGE_KEYS } from '../config';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
  get isAuth() {
    return this.status === 401;
  }
  get isOffline() {
    return this.status === 0;
  }
}

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

export async function getApiUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.apiUrl);
    if (saved) return saved.replace(/\/+$/, '');
  } catch {
    /* ignore */
  }
  return DEFAULT_API_URL.replace(/\/+$/, '');
}

export async function setApiUrl(url: string | null) {
  if (url && url.trim()) await AsyncStorage.setItem(STORAGE_KEYS.apiUrl, url.trim());
  else await AsyncStorage.removeItem(STORAGE_KEYS.apiUrl);
}

export const tokenStore = {
  get: () => SecureStore.getItemAsync(STORAGE_KEYS.token),
  set: (token: string) => SecureStore.setItemAsync(STORAGE_KEYS.token, token),
  clear: () => SecureStore.deleteItemAsync(STORAGE_KEYS.token),
};

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  const ax = err as AxiosError<{ message?: string; errors?: unknown }>;
  if (ax?.isAxiosError) {
    if (!ax.response) return new ApiError(0, 'No connection to the server. Working offline.');
    const msg = ax.response.data?.message || ax.message || `Request failed (${ax.response.status})`;
    return new ApiError(ax.response.status, msg, ax.response.data?.errors);
  }
  return new ApiError(-1, (err as Error)?.message || 'Unexpected error');
}

export const http: AxiosInstance = axios.create({
  timeout: 60000,
  headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
});

http.interceptors.request.use(async (config) => {
  config.baseURL = await getApiUrl();
  const token = await tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) delete config.headers['Content-Type'];
  return config;
});

http.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !String(error.config?.url).includes('/auth/login')) {
      onUnauthorized?.();
    }
    return Promise.reject(toApiError(error));
  }
);

/** Unwraps the ERP's `{ success, message, data }` envelope. */
export const unwrap = <T>(res: { data: { data?: T } & Partial<T> }): T =>
  (res.data?.data !== undefined ? res.data.data : (res.data as unknown)) as T;
