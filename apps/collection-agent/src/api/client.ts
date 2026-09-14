import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

export const ACCESS_TOKEN_KEY = 'sunsea.collection.accessToken';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:5000/api';

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

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
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
