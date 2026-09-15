// Whether the app is running on the seeded demo dataset instead of a real
// signed-in session. Mirrors the caching pattern in api/serverUrl.ts: an
// in-memory flag for the hot path (the axios request interceptor reads this
// on every single request, including from the headless location task) backed
// by AsyncStorage so a demo session survives an app restart the same way a
// real one would.

import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEMO_MODE_STORAGE_KEY = 'sunsea.collection.demoMode';

let cachedDemoMode: boolean | null = null;
let hydratePromise: Promise<boolean> | null = null;

export function hydrateDemoMode(): Promise<boolean> {
  if (cachedDemoMode !== null) return Promise.resolve(cachedDemoMode);
  if (!hydratePromise) {
    hydratePromise = AsyncStorage.getItem(DEMO_MODE_STORAGE_KEY)
      .then((stored) => {
        cachedDemoMode = stored === '1';
        return cachedDemoMode;
      })
      .catch(() => {
        cachedDemoMode = false;
        return cachedDemoMode;
      });
  }
  return hydratePromise;
}

/** Synchronous read — safe before hydration completes (returns false until
 * then), for the request interceptor which can't await on every call. */
export function isDemoMode(): boolean {
  return cachedDemoMode ?? false;
}

export async function setDemoMode(enabled: boolean): Promise<void> {
  cachedDemoMode = enabled;
  hydratePromise = Promise.resolve(enabled);
  try {
    if (enabled) {
      await AsyncStorage.setItem(DEMO_MODE_STORAGE_KEY, '1');
    } else {
      await AsyncStorage.removeItem(DEMO_MODE_STORAGE_KEY);
    }
  } catch {
    // Best-effort — the in-memory flag is already updated for this session.
  }
}
