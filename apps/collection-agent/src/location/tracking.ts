import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { enqueue } from '@/offline/queue';
import type { LocationPing } from '@/api/agentApi';

export const SUNSEA_AGENT_LOCATION_TASK = 'SUNSEA_AGENT_LOCATION_TASK';

const BUFFER_KEY = 'sunsea.collection.locationBuffer.v1';
const PREF_KEY = 'sunsea.collection.trackingEnabled';
const FLUSH_INTERVAL_MS = 30_000;
const FLUSH_POINT_COUNT = 20;
// If a flush keeps failing (offline, background task starved), don't let the
// in-memory buffer grow forever before the next flush attempt — keep only
// the most recent points so the eventual sync isn't itself huge.
const MAX_BUFFERED_POINTS = 500;

let lastFlushAt = 0;

async function readBuffer(): Promise<LocationPing[]> {
  try {
    const raw = await AsyncStorage.getItem(BUFFER_KEY);
    return raw ? (JSON.parse(raw) as LocationPing[]) : [];
  } catch {
    return [];
  }
}

async function writeBuffer(points: LocationPing[]) {
  try {
    await AsyncStorage.setItem(BUFFER_KEY, JSON.stringify(points));
  } catch {
    // ignore
  }
}

async function flushBufferIfDue(force = false) {
  try {
    const points = await readBuffer();
    if (points.length === 0) return;
    const dueByTime = Date.now() - lastFlushAt >= FLUSH_INTERVAL_MS;
    const dueByCount = points.length >= FLUSH_POINT_COUNT;
    if (!force && !dueByTime && !dueByCount) return;

    lastFlushAt = Date.now();
    await writeBuffer([]);
    // Locations go through the offline queue too, so a lost connection during
    // a drive doesn't drop breadcrumbs — they replay in order once online.
    await enqueue('locations', points);
  } catch {
    // A failure here (AsyncStorage hiccup, enqueue error) must never crash
    // the background task — the points stay/return to the buffer either way
    // via readBuffer's own try/catch, and the next tick tries again.
  }
}

TaskManager.defineTask(SUNSEA_AGENT_LOCATION_TASK, async ({ data, error }) => {
  // A thrown error from this task can get it unregistered by the OS on some
  // Android versions, silently ending tracking — never let anything escape.
  try {
    if (error) return;
    const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations ?? [];
    if (locations.length === 0) return;

    let batteryLevel: number | null = null;
    try {
      batteryLevel = await Battery.getBatteryLevelAsync();
    } catch {
      batteryLevel = null;
    }

    const points = await readBuffer();
    const newPoints: LocationPing[] = locations.map((loc) => ({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? null,
      altitude: loc.coords.altitude ?? null,
      speed: loc.coords.speed ?? null,
      heading: loc.coords.heading ?? null,
      batteryLevel: batteryLevel != null ? Math.round(batteryLevel * 100) : null,
      isMoving: (loc.coords.speed ?? 0) > 0.5,
      source: 'background',
      recordedAt: new Date(loc.timestamp).toISOString(),
    }));
    const merged = [...points, ...newPoints];
    // Bound the buffer: keep only the most recent points if flushes have
    // been failing for a while (offline, task throttled in the background).
    const bounded = merged.length > MAX_BUFFERED_POINTS ? merged.slice(merged.length - MAX_BUFFERED_POINTS) : merged;
    await writeBuffer(bounded);
    await flushBufferIfDue();
  } catch {
    // Swallow — see comment above.
  }
});

export async function setTrackingPreference(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(PREF_KEY, enabled ? '1' : '0');
}

export async function getTrackingPreference(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PREF_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function requestLocationPermissions(): Promise<{
  foreground: boolean;
  background: boolean;
}> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    return { foreground: false, background: false };
  }
  const bg = await Location.requestBackgroundPermissionsAsync();
  return { foreground: true, background: bg.status === 'granted' };
}

export async function isTracking(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(SUNSEA_AGENT_LOCATION_TASK);
  } catch {
    return false;
  }
}

export async function startTracking(): Promise<{ started: boolean; backgroundGranted: boolean }> {
  const { foreground, background } = await requestLocationPermissions();
  if (!foreground) return { started: false, backgroundGranted: false };

  const already = await isTracking();
  if (already) {
    await setTrackingPreference(true);
    return { started: true, backgroundGranted: background };
  }

  try {
    await Location.startLocationUpdatesAsync(SUNSEA_AGENT_LOCATION_TASK, {
      // Without "Allow all the time" the OS silently caps this to
      // foreground-only updates — still useful, so don't treat it as failure.
      accuracy: background ? Location.Accuracy.High : Location.Accuracy.Balanced,
      timeInterval: 15000,
      distanceInterval: 15,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'SunSea Collect is tracking your route',
        notificationBody: 'Location is shared with the office while you are on collection duty.',
        notificationColor: '#0F6E4F',
      },
    });
  } catch {
    // Android 14+ can refuse to start a location foreground service if the
    // manifest's foreground service type isn't declared, or the OS revoked
    // the permission between the check above and this call — fail closed
    // rather than leaving the preference on with no task actually running.
    await setTrackingPreference(false);
    return { started: false, backgroundGranted: false };
  }
  await setTrackingPreference(true);
  return { started: true, backgroundGranted: background };
}

export async function stopTracking(): Promise<void> {
  try {
    if (await isTracking()) {
      await Location.stopLocationUpdatesAsync(SUNSEA_AGENT_LOCATION_TASK);
    }
  } catch {
    // ignore
  }
  await setTrackingPreference(false);
  await flushBufferIfDue(true);
}

/** Auto-resume tracking after login if the agent previously left it enabled. */
export async function resumeTrackingIfEnabled(): Promise<void> {
  const enabled = await getTrackingPreference();
  if (!enabled) return;
  const already = await isTracking();
  if (already) return;
  await startTracking().catch(() => {});
}

export interface CurrentPosition {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export async function getCurrentPosition(): Promise<CurrentPosition | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      const req = await Location.requestForegroundPermissionsAsync();
      if (req.status !== 'granted') return null;
    }
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? null,
    };
  } catch {
    return null;
  }
}
