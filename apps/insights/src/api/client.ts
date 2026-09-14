import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

export const TOKEN_KEY = 'insights.accessToken';

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://10.0.2.2:5000/api';

/** Called by the auth store when the server tells us the session is dead. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
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
    if (error.response?.status === 401) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message ?? error.message ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
