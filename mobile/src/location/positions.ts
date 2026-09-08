/**
 * Location sharing: while the agent's day is open (and the setting is on), the
 * phone records its position in the foreground and sends batches to
 * POST /api/field/positions, which feeds the "Field Sales — GPS" scene on the
 * office TV wall. Positions queue on the device and flush with the next sync
 * when there is no signal. Never runs in demo mode; foreground only, so no
 * background-location permission is needed.
 */
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { http, ApiError } from '../api/client';
import { newId } from '../utils/ids';

export type PositionSource = 'PING' | 'DAY_START' | 'DAY_END' | 'CHECK_IN' | 'CHECK_OUT';
export interface QueuedPosition {
  clientId: string;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  speedKmh: number | null;
  heading: number | null;
  batteryPct: number | null;
  source: PositionSource;
  visitId: string | null;
  customerId: string | null;
  recordedAt: number;
}

const KEY_QUEUE = 'sunsea.positions.queue';
const KEY_ENABLED = 'sunsea.positions.enabled';
const KEY_STATUS = 'sunsea.positions.status';
const MAX_QUEUE = 600;
const PING_MS = 2 * 60 * 1000; // at most one ping every two minutes…
const PING_METERS = 120; // …or when the phone has moved 120 m

export interface ShareStatus {
  lastSentAt: number | null;
  lastError: string | null;
  /** Server has no /field module (404) — sharing paused until it appears. */
  unsupported: boolean;
  unsupportedCheckedAt: number | null;
  queued: number;
}

export async function isSharingEnabled() {
  try {
    return (await AsyncStorage.getItem(KEY_ENABLED)) !== '0'; // on by default
  } catch {
    return true;
  }
}
export const setSharingEnabled = (on: boolean) => AsyncStorage.setItem(KEY_ENABLED, on ? '1' : '0');

export async function getShareStatus(): Promise<ShareStatus> {
  const [raw, queue] = await Promise.all([AsyncStorage.getItem(KEY_STATUS), readQueue()]);
  const base: ShareStatus = { lastSentAt: null, lastError: null, unsupported: false, unsupportedCheckedAt: null, queued: 0 };
  const parsed = raw ? { ...base, ...(JSON.parse(raw) as Partial<ShareStatus>) } : base;
  return { ...parsed, queued: queue.length };
}
async function setStatus(patch: Partial<ShareStatus>) {
  const cur = await getShareStatus();
  const { queued: _q, ...rest } = { ...cur, ...patch };
  await AsyncStorage.setItem(KEY_STATUS, JSON.stringify(rest));
}

async function readQueue(): Promise<QueuedPosition[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_QUEUE);
    return raw ? (JSON.parse(raw) as QueuedPosition[]) : [];
  } catch {
    return [];
  }
}
const writeQueue = (q: QueuedPosition[]) => AsyncStorage.setItem(KEY_QUEUE, JSON.stringify(q.slice(-MAX_QUEUE)));

/** Queue one position (from a check-in, day start, etc.) and try to send. */
export async function recordPosition(source: PositionSource, coords: { latitude: number; longitude: number; accuracy?: number | null; speed?: number | null; heading?: number | null } | null, extra: { visitId?: string | null; customerId?: string | null } = {}) {
  if (!coords) return;
  const q = await readQueue();
  q.push({
    clientId: newId(),
    latitude: Number(coords.latitude.toFixed(7)),
    longitude: Number(coords.longitude.toFixed(7)),
    accuracyM: coords.accuracy == null ? null : Math.round(coords.accuracy * 10) / 10,
    speedKmh: coords.speed == null || coords.speed < 0 ? null : Math.round(coords.speed * 3.6 * 10) / 10,
    heading: coords.heading == null || coords.heading < 0 ? null : Math.round(coords.heading),
    batteryPct: null,
    source,
    visitId: extra.visitId ?? null,
    customerId: extra.customerId ?? null,
    recordedAt: Date.now(),
  });
  await writeQueue(q);
  void flushPositions();
}

let flushing = false;
/** Sends everything queued. Safe to call often; returns the number accepted. */
export async function flushPositions(): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  try {
    const q = await readQueue();
    if (q.length === 0) return 0;
    const status = await getShareStatus();
    // If the server told us it has no /field module, re-check at most every 6 hours.
    if (status.unsupported && status.unsupportedCheckedAt && Date.now() - status.unsupportedCheckedAt < 6 * 3600_000) return 0;
    const batch = q.slice(0, 200);
    const res = await http.post('/field/positions', { positions: batch });
    const accepted = Number(res.data?.data?.accepted ?? batch.length);
    await writeQueue(q.slice(batch.length));
    await setStatus({ lastSentAt: Date.now(), lastError: null, unsupported: false, unsupportedCheckedAt: null });
    return accepted;
  } catch (e) {
    const err = e as ApiError;
    if (err.status === 404) {
      await setStatus({ unsupported: true, unsupportedCheckedAt: Date.now(), lastError: 'Server has no location module yet' });
      // Keep only the newest few so the queue does not grow forever on an old server.
      const q = await readQueue();
      await writeQueue(q.slice(-50));
    } else if (err.status !== 0) {
      await setStatus({ lastError: err.message });
    }
    return 0;
  } finally {
    flushing = false;
  }
}

// ─── Foreground tracker ──────────────────────────────────────────────────────
let watcher: Location.LocationSubscription | null = null;
let lastPingAt = 0;

/** Starts foreground pings; no-op if already running or permission is denied. */
export async function startTracking() {
  if (watcher) return true;
  const perm = await Location.getForegroundPermissionsAsync();
  const granted = perm.granted || (await Location.requestForegroundPermissionsAsync()).granted;
  if (!granted) return false;
  watcher = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: PING_MS, distanceInterval: PING_METERS }, (pos) => {
    if (Date.now() - lastPingAt < PING_MS * 0.8) return;
    lastPingAt = Date.now();
    void recordPosition('PING', { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy, speed: pos.coords.speed, heading: pos.coords.heading });
  });
  return true;
}

export function stopTracking() {
  watcher?.remove();
  watcher = null;
}
export const isTracking = () => watcher !== null;

/** One-off fix for check-ins etc. */
export async function currentCoords() {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    const granted = perm.granted || (await Location.requestForegroundPermissionsAsync()).granted;
    if (!granted) return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy, speed: pos.coords.speed, heading: pos.coords.heading };
  } catch {
    return null;
  }
}
