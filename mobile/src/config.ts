import Constants from 'expo-constants';

/**
 * Backend base URL (including `/api`). Resolution order:
 *  1. value saved on the device from the Settings screen (lets the field team
 *     point a build at a test server without rebuilding),
 *  2. EXPO_PUBLIC_API_URL at build time,
 *  3. expo.extra.apiUrl in app.json.
 */
export const DEFAULT_API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  'http://localhost:5000/api';

export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

/** Auto-sync cadence while the app is in the foreground. */
export const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;

/** Longest edge of receipt / cheque photos before upload. */
export const PHOTO_MAX_EDGE = 1400;
export const PHOTO_QUALITY = 0.72;

export const STORAGE_KEYS = {
  token: 'sunsea.token',
  agent: 'sunsea.agent',
  apiUrl: 'sunsea.apiUrl',
  lastSyncAt: 'sunsea.lastSyncAt',
  lastSyncError: 'sunsea.lastSyncError',
  bootstrap: 'sunsea.bootstrap',
  demo: 'sunsea.demo',
} as const;
