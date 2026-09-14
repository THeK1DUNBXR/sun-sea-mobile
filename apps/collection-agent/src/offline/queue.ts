import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Network from 'expo-network';
import { onlineManager } from '@tanstack/react-query';

import { submitCollection, submitDeposit, submitVisit, pushLocations } from '@/api/agentApi';
import type { SubmitCollectionInput, SubmitDepositInput, SubmitVisitInput, LocationPing } from '@/api/agentApi';

const QUEUE_KEY = 'sunsea.collection.offlineQueue.v1';

/** After this many failed attempts, stop auto-retrying an item on every
 * flush — it still shows up in the sync list for the agent to retry by hand
 * (a bad clientRef collision, a permanently rejected payload, etc.). */
const MAX_AUTO_ATTEMPTS = 8;

/** Location breadcrumb batches older than this are dropped rather than kept
 * forever — a long stretch offline shouldn't grow the queue unbounded, and a
 * multi-hour-old GPS trail is no longer useful to the live map. */
const MAX_LOCATION_BATCHES = 50;

export type QueueItemKind = 'collection' | 'visit' | 'deposit' | 'locations';

export interface QueueItem {
  id: string;
  kind: QueueItemKind;
  clientRef: string;
  payload: unknown;
  createdAt: string;
  attempts: number;
  lastError?: string | null;
  /** True once the item has failed MAX_AUTO_ATTEMPTS times or hit a
   * non-retryable error — flush() skips it until the agent retries by hand. */
  needsAttention?: boolean;
}

type Listener = (items: QueueItem[]) => void;

let cache: QueueItem[] | null = null;
const listeners = new Set<Listener>();
let flushing = false;

// A short, session-only log of "synced, but with a caveat" notes (e.g. a
// photo that had been deleted before its queued item replayed) — surfaced on
// the Profile screen so an agent isn't left wondering why a proof photo
// never shows up on a receipt that otherwise synced fine.
export interface SyncNote {
  id: string;
  clientRef: string;
  message: string;
  at: string;
}
const MAX_SYNC_NOTES = 20;
let syncNotes: SyncNote[] = [];
const noteListeners = new Set<(notes: SyncNote[]) => void>();

function markNeedsReview(clientRef: string, message: string) {
  syncNotes = [{ id: newClientRef(), clientRef, message, at: new Date().toISOString() }, ...syncNotes].slice(
    0,
    MAX_SYNC_NOTES,
  );
  noteListeners.forEach((l) => l(syncNotes));
}

export function subscribeSyncNotes(listener: (notes: SyncNote[]) => void): () => void {
  noteListeners.add(listener);
  listener(syncNotes);
  return () => noteListeners.delete(listener);
}

export function dismissSyncNote(id: string) {
  syncNotes = syncNotes.filter((n) => n.id !== id);
  noteListeners.forEach((l) => l(syncNotes));
}

async function readQueue(): Promise<QueueItem[]> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    cache = raw ? (JSON.parse(raw) as QueueItem[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

async function writeQueue(items: QueueItem[]) {
  cache = items;
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    // best-effort persistence; in-memory cache still reflects latest state
  }
  listeners.forEach((l) => l(items));
}

export function subscribeQueue(listener: Listener): () => void {
  listeners.add(listener);
  readQueue().then((items) => listener(items));
  return () => listeners.delete(listener);
}

export async function getQueue(): Promise<QueueItem[]> {
  return readQueue();
}

function newClientRef(): string {
  try {
    return Crypto.randomUUID();
  } catch {
    return `cref-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export async function enqueue(kind: QueueItemKind, payload: unknown, clientRef?: string): Promise<QueueItem> {
  const items = await readQueue();
  const item: QueueItem = {
    id: newClientRef(),
    kind,
    clientRef: clientRef ?? newClientRef(),
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  };
  let next = [...items, item];
  if (kind === 'locations') {
    // Bound how many location batches can pile up while offline for a long
    // stretch — drop the oldest ones rather than growing AsyncStorage
    // unbounded; recent breadcrumbs matter far more than hours-old ones.
    const locationIds = next.filter((i) => i.kind === 'locations').map((i) => i.id);
    if (locationIds.length > MAX_LOCATION_BATCHES) {
      const dropIds = new Set(locationIds.slice(0, locationIds.length - MAX_LOCATION_BATCHES));
      next = next.filter((i) => !dropIds.has(i.id));
    }
  }
  await writeQueue(next);
  flush().catch(() => {});
  return item;
}

async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return Boolean(state.isConnected && state.isInternetReachable !== false);
  } catch {
    return true; // assume online if we can't tell; the request itself will fail fast otherwise
  }
}

function isDuplicateOrSuccess(error: any): boolean {
  const status = error?.response?.status;
  if (status === 409) return true;
  const message: string = error?.response?.data?.message ?? '';
  return /duplicate|already exists|idempotent/i.test(message);
}

/** No `response` on an axios error means the request never reached the
 * server (offline, DNS failure, timeout) — worth pausing the whole flush
 * for. A `response` means the server was reached and rejected the payload,
 * which is specific to that item and shouldn't block the rest of the queue. */
function isNetworkError(error: any): boolean {
  return Boolean(error?.isAxiosError) && !error?.response;
}

function describeError(error: any): string {
  const serverMessage = error?.response?.data?.message;
  if (typeof serverMessage === 'string' && serverMessage) return serverMessage;
  if (isNetworkError(error)) return 'No connection — will retry automatically.';
  return error?.message ?? 'Sync failed';
}

async function sendItem(item: QueueItem): Promise<{ droppedFiles: string[] }> {
  switch (item.kind) {
    case 'collection': {
      const result = await submitCollection(item.payload as SubmitCollectionInput);
      return { droppedFiles: result.droppedFiles };
    }
    case 'visit': {
      const result = await submitVisit(item.payload as SubmitVisitInput);
      return { droppedFiles: result.droppedFiles };
    }
    case 'deposit': {
      const result = await submitDeposit(item.payload as SubmitDepositInput);
      return { droppedFiles: result.droppedFiles };
    }
    case 'locations':
      await pushLocations(item.payload as LocationPing[]);
      return { droppedFiles: [] };
    default:
      return { droppedFiles: [] };
  }
}

/** Flushes the queue in order. Items that fail with a server-side
 * (non-network) error are set aside with `needsAttention` instead of
 * blocking everything behind them — a stale photo or a bad clientRef on one
 * record shouldn't wedge unrelated visits/deposits/locations. Progress is
 * persisted after every item, so an app kill mid-flush loses no ground.
 * Safe to call repeatedly/concurrently (a module-level mutex short-circuits
 * re-entry). */
export async function flush(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    if (!(await isOnline())) return;
    let items = await readQueue();
    let sawNetworkError = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (sawNetworkError || item.needsAttention) continue;

      try {
        const { droppedFiles } = await sendItem(item);
        if (droppedFiles.length > 0) {
          // Recorded successfully server-side, but a photo/signature had
          // been deleted from disk before this replayed — note it (visible
          // in the sync list) without treating the item as failed.
          markNeedsReview(item.clientRef, `Synced without ${droppedFiles.join(' and ')} — file was no longer on the device.`);
        }
        // Sent (or already recorded server-side) — drop from queue.
        items = items.filter((i2) => i2.id !== item.id);
        i = -1; // indices shifted; restart the scan over what's left
        await writeQueue(items);
      } catch (error: any) {
        if (isDuplicateOrSuccess(error)) {
          items = items.filter((i2) => i2.id !== item.id);
          i = -1;
          await writeQueue(items);
          continue;
        }
        if (isNetworkError(error)) {
          sawNetworkError = true;
          items = items.map((i2) => (i2.id === item.id ? { ...i2, lastError: describeError(error) } : i2));
          await writeQueue(items);
          continue;
        }
        const attempts = item.attempts + 1;
        items = items.map((i2) =>
          i2.id === item.id
            ? { ...i2, attempts, lastError: describeError(error), needsAttention: attempts >= MAX_AUTO_ATTEMPTS }
            : i2,
        );
        await writeQueue(items);
      }
    }
  } finally {
    flushing = false;
  }
}

export async function retryItem(id: string): Promise<void> {
  const items = await readQueue();
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return;
  const updated = [...items];
  updated[idx] = { ...updated[idx], lastError: null, needsAttention: false };
  await writeQueue(updated);
  await flush();
}

export async function removeItem(id: string): Promise<void> {
  const items = await readQueue();
  await writeQueue(items.filter((i) => i.id !== id));
}

// Flush automatically when connectivity comes back, in addition to the
// foreground trigger in useSyncStatus — a queue built up overnight offline
// shouldn't need the agent to background/foreground the app to start syncing.
let wasOnline = true;
onlineManager.subscribe((online) => {
  if (online && !wasOnline) flush().catch(() => {});
  wasOnline = online;
});
