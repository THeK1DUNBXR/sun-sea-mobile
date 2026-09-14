import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Network from 'expo-network';

import { submitCollection, submitDeposit, submitVisit, pushLocations } from '@/api/agentApi';
import type { SubmitCollectionInput, SubmitDepositInput, SubmitVisitInput, LocationPing } from '@/api/agentApi';

const QUEUE_KEY = 'sunsea.collection.offlineQueue.v1';

export type QueueItemKind = 'collection' | 'visit' | 'deposit' | 'locations';

export interface QueueItem {
  id: string;
  kind: QueueItemKind;
  clientRef: string;
  payload: unknown;
  createdAt: string;
  attempts: number;
  lastError?: string | null;
}

type Listener = (items: QueueItem[]) => void;

let cache: QueueItem[] | null = null;
const listeners = new Set<Listener>();
let flushing = false;

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
  await writeQueue([...items, item]);
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

async function sendItem(item: QueueItem): Promise<void> {
  switch (item.kind) {
    case 'collection':
      await submitCollection(item.payload as SubmitCollectionInput);
      return;
    case 'visit':
      await submitVisit(item.payload as SubmitVisitInput);
      return;
    case 'deposit':
      await submitDeposit(item.payload as SubmitDepositInput);
      return;
    case 'locations':
      await pushLocations(item.payload as LocationPing[]);
      return;
    default:
      return;
  }
}

/** Flushes the queue FIFO. Safe to call repeatedly/concurrently. */
export async function flush(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    if (!(await isOnline())) return;
    let items = await readQueue();
    while (items.length > 0) {
      const [head, ...rest] = items;
      try {
        await sendItem(head);
        items = rest;
        await writeQueue(items);
      } catch (error: any) {
        if (isDuplicateOrSuccess(error)) {
          items = rest;
          await writeQueue(items);
          continue;
        }
        const attempts = head.attempts + 1;
        const updated: QueueItem = {
          ...head,
          attempts,
          lastError: error?.message ?? 'Sync failed',
        };
        items = [updated, ...rest];
        await writeQueue(items);
        // Exponential backoff: stop this flush pass, retry later (next
        // enqueue, foreground event, or manual retry) rather than busy-loop.
        break;
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
  updated[idx] = { ...updated[idx], lastError: null };
  await writeQueue(updated);
  await flush();
}

export async function removeItem(id: string): Promise<void> {
  const items = await readQueue();
  await writeQueue(items.filter((i) => i.id !== id));
}
